// src/components/student/ReservationForm.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MAX_ITEMS_PER_DAY = 5;
const MAX_REDEMPTIONS_PER_WEEK = 3;

function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// 🌟 FIXED: Timezone-safe date check engine to defeat local browser time-shifting bugs
function checkIsExpired(expiryDate) {
  if (!expiryDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Strip time parameters for accurate midnight comparison
  
  const [year, month, day] = expiryDate.slice(0, 10).split('-').map(Number);
  const itemExpiry = new Date(year, month - 1, day);
  itemExpiry.setHours(0, 0, 0, 0);
  
  return itemExpiry < today;
}

export default function ReservationForm({ preselectedItem, onSuccess }) {
  const { currentUser } = useAuth();
  const [items, setItems]           = useState([]);
  const [cart, setCart]             = useState([]);   // [{id, itemName, category, expiryDate}]
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback]     = useState(null);
  const [usageToday, setUsageToday] = useState(0);
  const [usageWeek, setUsageWeek]   = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Load inventory
  useEffect(() => {
    api.get('/api/inventory')
      .then(r => setItems(r.data.filter(i => i.quantity > 0)))
      .catch(console.error);
  }, []);

  // Load today's and this week's usage from reservations
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await api.get(`/api/reservation/${currentUser.uid}`);
        const all = res.data;

        const todayStr = getStartOfDay();
        const weekStr  = getStartOfWeek();

        // Count items reserved today (each reservation = 1 unit, status != cancelled)
        const todayItems = all.filter(r =>
          r.status !== 'cancelled' &&
          r.reservedAt >= todayStr
        );
        const weekRedemptions = all.filter(r =>
          r.status !== 'cancelled' &&
          r.reservedAt >= weekStr
        );

        // Today: count total items (each reservation doc = 1 item, qty = 1)
        setUsageToday(todayItems.reduce((sum, r) => sum + (r.quantity || 1), 0));
        // Week: count number of checkout sessions (group by date)
        const weekDays = new Set(
          weekRedemptions.map(r => r.reservedAt?.slice(0, 10))
        );
        setUsageWeek(weekDays.size);
      } catch {
        // ignore
      } finally {
        setLoadingUsage(false);
      }
    }
    fetchUsage();
  }, [currentUser.uid]);

  // Auto-add preselected item to cart
  useEffect(() => {
    if (preselectedItem && !cart.find(c => c.id === preselectedItem.id)) {
      // 🌟 EXTRA SAFETY LAYER: Prevent preselected item from bypassing checkout limits if expired
      if (checkIsExpired(preselectedItem.expiryDate)) {
        setFeedback({ msg: 'Cannot add preselected item: This item has expired.', type: 'error' });
        return;
      }
      setCart(prev => [...prev, preselectedItem]);
    }
  }, [preselectedItem]);

  function addToCart(item) {
    if (checkIsExpired(item.expiryDate)) {
      setFeedback({ msg: 'Cannot add to cart: This item has expired.', type: 'error' }); return;
    }
    if (cart.find(c => c.id === item.id)) {
      setFeedback({ msg: 'Item already in cart.', type: 'info' }); return;
    }
    if (cart.length + usageToday >= MAX_ITEMS_PER_DAY) {
      setFeedback({ msg: `Daily limit reached (${MAX_ITEMS_PER_DAY} items/day).`, type: 'error' }); return;
    }
    setCart(prev => [...prev, item]);
    setFeedback(null);
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(c => c.id !== id));
  }

  async function handleCheckout(method) {
    if (cart.length === 0) {
      setFeedback({ msg: 'Your cart is empty.', type: 'error' }); return;
    }
    if (usageWeek >= MAX_REDEMPTIONS_PER_WEEK) {
      setFeedback({ msg: `Weekly limit reached (${MAX_REDEMPTIONS_PER_WEEK} redemptions/week).`, type: 'error' }); return;
    }
    if (cart.length + usageToday > MAX_ITEMS_PER_DAY) {
      setFeedback({ msg: `Exceeds daily limit. You can only take ${MAX_ITEMS_PER_DAY - usageToday} more item(s) today.`, type: 'error' }); return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      // Create one reservation per cart item (quantity = 1 each)
      await Promise.all(
        cart.map(item =>
          api.post('/api/reservation/create', {
            studentId: currentUser.uid,
            itemId: item.id,
            quantity: 1,
            method, // 'reserve' or 'get_now'
          })
        )
      );

      setFeedback({
        msg: method === 'get_now'
          ? `✅ ${cart.length} item(s) collected! Show this to the pantry staff.`
          : `✅ ${cart.length} item(s) reserved! Pick up at the pantry.`,
        type: 'success',
      });
      setCart([]);
      setUsageToday(prev => prev + cart.length);
      if (method === 'reserve') setUsageWeek(prev => prev + 1);
      setTimeout(() => onSuccess?.(), 2000);
    } catch (e) {
      setFeedback({ msg: e.response?.data?.error || 'Checkout failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const remainingToday = MAX_ITEMS_PER_DAY - usageToday - cart.length;
  const remainingWeek  = MAX_REDEMPTIONS_PER_WEEK - usageWeek;

  const cartStyle = {
    background: 'white',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginBottom: 16,
  };

  return (
    <div>
      {/* Usage Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={usagePill(usageToday >= MAX_ITEMS_PER_DAY)}>
          📦 Today: <strong>{usageToday}/{MAX_ITEMS_PER_DAY}</strong> items
        </div>
        <div style={usagePill(usageWeek >= MAX_REDEMPTIONS_PER_WEEK)}>
          📅 This week: <strong>{usageWeek}/{MAX_REDEMPTIONS_PER_WEEK}</strong> redemptions
        </div>
        {remainingToday <= 2 && remainingToday > 0 && (
          <div style={usagePill(true)}>⚠️ Only {remainingToday} slot(s) left today</div>
        )}
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : feedback.type === 'info' ? 'info' : 'error'}`}
          style={{ marginBottom: 12 }}>
          {feedback.msg}
        </div>
      )}

      {/* Cart */}
      <div style={cartStyle}>
        <h2 style={{ marginBottom: 12 }}>🛒 Cart ({cart.length}/{MAX_ITEMS_PER_DAY - usageToday} remaining today)</h2>

        {cart.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.88rem' }}>
            Your cart is empty. Add items from the list below.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Item</th>
                <th style={th}>Category</th>
                <th style={th}>Expires</th>
                <th style={th}>Qty</th>
                <th style={th}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr key={item.id}>
                  <td style={td}><strong>{item.itemName}</strong></td>
                  <td style={td}>{item.category}</td>
                  <td style={td}>{item.expiryDate?.slice(0, 10)}</td>
                  <td style={td}>1</td>
                  <td style={td}>
                    <button onClick={() => removeFromCart(item.id)}
                      style={{ background: '#fce4ec', color: '#c62828', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Checkout buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleCheckout('reserve')}
            disabled={submitting || cart.length === 0 || usageWeek >= MAX_REDEMPTIONS_PER_WEEK}
            style={checkoutBtn('#2e7d32', submitting || cart.length === 0 || usageWeek >= MAX_REDEMPTIONS_PER_WEEK)}
          >
            📋 Reserve (Pick up later)
          </button>
          <button
            onClick={() => handleCheckout('get_now')}
            disabled={submitting || cart.length === 0 || usageWeek >= MAX_REDEMPTIONS_PER_WEEK}
            style={checkoutBtn('#1565c0', submitting || cart.length === 0 || usageWeek >= MAX_REDEMPTIONS_PER_WEEK)}
          >
            🎁 Get Now (Collect today)
          </button>
        </div>

        {usageWeek >= MAX_REDEMPTIONS_PER_WEEK && (
          <p style={{ color: '#c62828', fontSize: '0.82rem', marginTop: 8 }}>
            ⛔ Weekly redemption limit reached. Resets next Sunday.
          </p>
        )}
      </div>

      {/* Available Items */}
      <div style={cartStyle}>
        <h2 style={{ marginBottom: 12 }}>📦 Available Items</h2>
        {items.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No items in stock.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {items.map(item => {
              const inCart = !!cart.find(c => c.id === item.id);
              const expired = checkIsExpired(item.expiryDate);
              
              // 🌟 STEP 1: Compound button disability tracking parameters
              const disabled = inCart || remainingToday <= 0 || expired;

              // 🌟 STEP 2: Configure color states and text responses dynamically
              let buttonText = '+ Add to Cart';
              let buttonBg = '#2e7d32';
              let buttonColor = 'white';

              if (expired) {
                buttonText = '❌ Expired';
                buttonBg = '#fca5a5';
                buttonColor = '#b91c1c';
              } else if (inCart) {
                buttonText = '✓ In Cart';
                buttonBg = '#a5d6a7';
                buttonColor = '#1b5e20';
              } else if (disabled) {
                buttonBg = '#eee';
                buttonColor = '#aaa';
              }

              return (
                <div key={item.id} style={{
                  border: expired ? '1px solid #fca5a5' : inCart ? '2px solid #2e7d32' : '1px solid #e8e8e8',
                  borderRadius: 8, padding: 14,
                  background: expired ? '#fff5f5' : inCart ? '#f1f8e9' : 'white',
                  opacity: expired ? 0.8 : 1,
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{item.category}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.itemName}</div>
                  
                  {/* Highlight date row elements if expired */}
                  <div style={{ 
                    fontSize: '0.78rem', 
                    color: expired ? '#b91c1c' : '#888', 
                    fontWeight: expired ? '600' : '400',
                    marginBottom: 10 
                  }}>
                    {expired ? `⚠️ Expired: ${item.expiryDate?.slice(0, 10)}` : `Expires: ${item.expiryDate?.slice(0, 10)}`}
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    disabled={disabled}
                    style={{
                      width: '100%', padding: '6px 0', border: 'none', borderRadius: 6,
                      background: buttonBg,
                      color: buttonColor,
                      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    }}
                  >
                    {buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function usagePill(isWarning) {
  return {
    background: isWarning ? '#fff3e0' : '#e8f5e9',
    color: isWarning ? '#e65100' : '#2e7d32',
    padding: '6px 14px', borderRadius: 20,
    fontSize: '0.82rem', fontWeight: 600,
  };
}
function checkoutBtn(color, disabled) {
  return {
    flex: 1, padding: '10px 0', border: 'none', borderRadius: 8,
    background: disabled ? '#ccc' : color,
    color: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.9rem', fontWeight: 600,
  };
}
const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: '0.82rem' };
const td = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' };