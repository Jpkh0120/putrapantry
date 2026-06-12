import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Admindashboard.css';
import ManageReservations from '../components/admin/ManageReservations';
import ManageUsers from '../components/admin/ManageUsers';
import RegressionSimulator from '../components/admin/RegressionSimulator';

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
const TABS = ['Forecast', 'Alerts', 'Inventory', 'Approvals', 'Users', 'Chatbot'];
const CATEGORIES = ['Grains & Rice', 'Canned Goods', 'Dairy', 'Fresh Produce', 'Protein', 'Beverages', 'Snacks', 'Other'];

const TAB_META = {
  Forecast:  { title: '7-Day Demand Forecast',      sub: 'Linear regression predictions based on pickup history' },
  Alerts:    { title: 'Inventory Alerts',            sub: 'Rule-based checks for expiry and low stock' },
  Inventory: { title: 'Inventory Management',        sub: 'Add, edit, and remove items from the food bank' },
  Approvals: { title: 'Student Pickup Approvals',    sub: 'Verify and sign off items handed over to students' },
  Users:     { title: 'User Account Management',     sub: 'Verify, suspend, reactivate, or delete student profiles' },
  Chatbot:   { title: 'AI Inventory Advisor',        sub: 'Get smart restocking recommendations powered by AI' },
};

// ── Forecast Tab ─────────────────────────────────────────────────────────────
function ForecastTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${AI_BASE_URL}/ai/demand-forecast`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="admin-loading">Loading forecast...</div>;
  if (error)   return <div className="admin-error">Failed to load forecast: {error}</div>;
  if (!data)   return null;

  const isSynthetic = data.model?.includes('synthetic');

  return (
    <div>
      <div className="forecast-meta">
        <span className="meta-badge">Model: {data.model}</span>
        <span className="meta-badge">Data points: {data.dataPoints}</span>
        {isSynthetic && <span className="meta-badge warning">Synthetic data — add real pickups to train</span>}
      </div>
      <p className="forecast-note">{data.note}</p>
      <div className="forecast-grid">
        {data.forecasts.map((item, i) => (
          <div key={i} className="forecast-card">
            <div className="forecast-card-header">
              <span className="forecast-item-id">{item.label || item.itemId}</span>
              <span className="forecast-total">{item.totalForecast7Days} units / 7d</span>
            </div>
            <div className="bar-chart">
              {item.forecastedDemand.map((qty, d) => {
                const max = Math.max(...item.forecastedDemand, 1);
                const height = Math.max(4, (qty / max) * 80);
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                return (
                  <div key={d} className="bar-col">
                    <span className="bar-label">{qty}</span>
                    <div className="bar" style={{ height: `${height}px` }} />
                    <span className="bar-day">{days[d]}</span>
                  </div>
                );
              })}
            </div>
            <div className="restock-row">
              <span>Suggested restock</span>
              <strong className="restock-qty">{item.suggestedRestockQty} units</strong>
            </div>
          </div>
        ))}
      </div>
      <RegressionSimulator liveForecasts={data.forecasts} />
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────────────────────
function AlertsTab({ inventoryItems, data, countExpired, countExpiringSoon, countLowStock, countFresh, handleDelete }) {
  return (
    <div className="alerts-wrapper">
      
      {/* 📊 4 Grid Status Summary Cards Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#991b1b', textTransform: 'uppercase' }}>🟥 Expired</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>{countExpired}</div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Past shelf life threshold</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #fef3c7', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#92400e', textTransform: 'uppercase' }}>🟨 Expiring Soon</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{countExpiringSoon}</div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Expires within 3 days</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ffedd5', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#9a3412', textTransform: 'uppercase' }}>🟧 Low Stock</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>{countLowStock}</div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Under 10 units remaining</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>🟩 Fresh</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{countFresh}</div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Healthy stock & safe dates</p>
        </div>
      </div>

      {/* 🛑 TABLE 1: EXPIRED ITEMS ACTION LIST (With Active Click Buttons) */}
      <div className="admin-card" style={{ marginBottom: '24px', borderTop: '4px solid #dc2626' }}>
        <h3 className="alerts-section-title" style={{ color: '#991b1b' }}>
          🛑 Expired Items Action List <span className="alert-count expiry" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>{countExpired}</span>
        </h3>
        {countExpired === 0 ? (
          <p className="admin-empty">Great job! There are currently no expired items in active stock.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Expired Date</th>
                <th>Current Qty</th>
                <th>Required Action</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map(item => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (!item.expiryDate) return null;
                const [year, month, day] = item.expiryDate.slice(0, 10).split('-').map(Number);
                const itemExpiry = new Date(year, month - 1, day);
                itemExpiry.setHours(0, 0, 0, 0);

                if (itemExpiry >= today) return null;

                return (
                  <tr key={item.id}>
                    <td><strong>{item.itemName}</strong></td>
                    <td><span className="meta-badge" style={{ fontSize: '0.8rem' }}>{item.category}</span></td>
                    <td style={{ color: '#d32f2f', fontWeight: '600' }}>{item.expiryDate?.slice(0, 10)}</td>
                    <td><strong>{item.quantity} units</strong></td>
                    <td>
                      {/* 🌟 CLICKABLE DISPOSE BUTTON OVERRIDE */}
                      <button 
                        className="inv-delete-btn"
                        onClick={() => handleDelete(item.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #f87171',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#b91c1c';
                          e.target.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#fee2e2';
                          e.target.style.color = '#b91c1c';
                        }}
                      >
                        🗑️ Dispose & Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 🗓️ TABLE 2: EXPIRING SOON TIMELINE */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <h3 className="alerts-section-title">
          Expiring Soon Timeline <span className="alert-count expiry">{data.expiryAlerts.length}</span>
        </h3>
        {data.expiryAlerts.length === 0 ? <p className="admin-empty">No items expiring within the warning window.</p> : (
          <table className="admin-table">
            <thead><tr><th>Item</th><th>Expiry Date</th><th>Days Left</th><th>Qty</th></tr></thead>
            <tbody>
              {data.expiryAlerts.map((a, i) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let isExpired = false;
                let trueDaysLeft = a.daysLeft;

                if (a.expiryDate) {
                  const [year, month, day] = a.expiryDate.slice(0, 10).split('-').map(Number);
                  const itemExpiry = new Date(year, month - 1, day);
                  itemExpiry.setHours(0, 0, 0, 0);

                  const timeDiff = itemExpiry.getTime() - today.getTime();
                  trueDaysLeft = Math.round(timeDiff / (1000 * 60 * 60 * 24));
                  isExpired = itemExpiry < today;
                }

                if (isExpired) return null;

                return (
                  <tr key={i}>
                    <td>{a.itemName}</td>
                    <td>{a.expiryDate?.slice(0, 10)}</td>
                    <td>
                      {trueDaysLeft === 0 ? (
                        <span className="days-badge critical">Expires Today</span>
                      ) : (
                        <span className={`days-badge ${trueDaysLeft <= 1 ? 'critical' : 'warning'}`}>
                          {trueDaysLeft}d
                        </span>
                      )}
                    </td>
                    <td>{a.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 📉 TABLE 3: LOW STOCK TRACKING */}
      <div className="admin-card">
        <h3 className="alerts-section-title">
          Low Stock Tracking <span className="alert-count low">{data.lowStockAlerts.length}</span>
        </h3>
        {data.lowStockAlerts.length === 0 ? <p className="admin-empty">All items are above the minimum threshold.</p> : (
          <table className="admin-table">
            <thead><tr><th>Item</th><th>Current Qty</th><th>Threshold</th><th>Status</th></tr></thead>
            <tbody>
              {data.lowStockAlerts.map((a, i) => (
                <tr key={i}>
                  <td>{a.itemName}</td>
                  <td><strong>{a.quantity}</strong></td>
                  <td>{a.threshold}</td>
                  <td><span className={`days-badge ${a.quantity === 0 ? 'critical' : 'warning'}`}>{a.quantity === 0 ? 'Out of stock' : 'Low'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { itemName: '', quantity: '', expiryDate: '', category: '' };

// ── Shared Parent State Wrapper Dashboard Core ────────────────────────────────
export default function AdminDashboard() {
  const { userName, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Inventory');

  // Unified data pipeline variables
  const [items, setItems] = useState([]);
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  function showFeedback(msg, type = 'success') {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  }

  // Dual fetch initialization tracker
  async function loadDashboardData() {
    setLoading(true);
    try {
      const [invRes, alertsRes] = await Promise.all([
        api.get('/api/inventory'),
        fetch(`${AI_BASE_URL}/ai/expiry-alerts`).then(r => r.json())
      ]);
      setItems(invRes.data);
      setAlertsData(alertsRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboardData(); }, []);

  function handleEdit(item) {
    setEditId(item.id);
    setForm({ itemName: item.itemName, quantity: item.quantity, expiryDate: item.expiryDate?.slice(0, 10) || '', category: item.category });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancel() { setEditId(null); setForm(EMPTY_FORM); }

  async function handleSubmit() {
    const { itemName, quantity, expiryDate, category } = form;
    if (!itemName || quantity === '' || !expiryDate || !category) { showFeedback('All fields are required.', 'error'); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/api/inventory/update/${editId}`, { ...form, quantity: Number(quantity) });
        showFeedback('Item updated successfully.');
      } else {
        await api.post('/api/inventory/add', { ...form, quantity: Number(quantity) });
        showFeedback('Item added successfully.');
      }
      setForm(EMPTY_FORM); setEditId(null); await loadDashboardData();
    } catch (e) { showFeedback(e.response?.data?.error || e.message, 'error'); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item from inventory?')) return;
    try { 
      await api.delete(`/api/inventory/delete/${id}`); 
      showFeedback('Item deleted successfully.'); 
      await loadDashboardData(); 
    }
    catch (e) { showFeedback(e.response?.data?.error || e.message, 'error'); }
  }

  async function handleLogout() {
    try { await logout(); window.location.href = '/login'; }
    catch (e) { console.error(e); }
  }

  // Core Math Aggregators
  let countExpired = 0, countExpiringSoon = 0, countLowStock = 0, countFresh = 0;
  items.forEach(item => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let isExpired = false, daysLeft = null;

    if (item.expiryDate) {
      const [year, month, day] = item.expiryDate.slice(0, 10).split('-').map(Number);
      const itemExpiry = new Date(year, month - 1, day); itemExpiry.setHours(0, 0, 0, 0);
      daysLeft = Math.round((itemExpiry.getTime() - today.getTime()) / 86400000);
      isExpired = itemExpiry < today;
    }
    const isLowStock = item.quantity < 10;
    if (isExpired) countExpired++;
    else if (daysLeft !== null && daysLeft <= 3) countExpiringSoon++;
    if (isLowStock) countLowStock++;
    if (!isExpired && (daysLeft === null || daysLeft > 3) && !isLowStock) countFresh++;
  });

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>PutraPantry</h1>
          <span className="admin-role-badge">Admin</span>
        </div>
        <div className="admin-header-right">
          <span className="admin-user">👤 {userName || 'Admin'}</span>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="admin-tab-nav">
        {TABS.map(tab => (
          <button key={tab} className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'Forecast'  && '📈 '} {tab === 'Alerts'    && '🔔 '} {tab === 'Inventory' && '📦 '}
            {tab === 'Approvals' && '✅ '} {tab === 'Users'     && '👥 '} {tab === 'Chatbot'   && '🤖 '}
            {tab}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        <div className="admin-section-header">
          <h2>{TAB_META[activeTab]?.title}</h2>
          <p className="admin-section-sub">{TAB_META[activeTab]?.sub}</p>
        </div>

        {loading ? (
          <div className="admin-loading">Synchronizing with food bank datastore...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : (
          <>
            {activeTab === 'Forecast'  && <ForecastTab />}
            {activeTab === 'Alerts'    && (
              <AlertsTab 
                inventoryItems={items} 
                data={alertsData}
                countExpired={countExpired}
                countExpiringSoon={countExpiringSoon}
                countLowStock={countLowStock}
                countFresh={countFresh}
                handleDelete={handleDelete}
              />
            )}
            {activeTab === 'Inventory' && (
              <div>
                {feedback && <div className={`inv-feedback ${feedback.type}`}>{feedback.msg}</div>}
                <div className="admin-card inv-form-card">
                  <h3 className="inv-form-title">{editId ? 'Edit Item' : 'Add New Item'}</h3>
                  <div className="inv-form-grid">
                    <div className="inv-field"><label>Item Name</label><input type="text" placeholder="e.g. Jasmine Rice" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} /></div>
                    <div className="inv-field"><label>Quantity</label><input type="number" min="0" placeholder="e.g. 50" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                    <div className="inv-field"><label>Expiry Date</label><input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
                    <div className="inv-field">
                      <label>Category</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="">Select category...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="inv-form-actions">
                    <button className="inv-submit-btn" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editId ? 'Update Item' : 'Add Item'}</button>
                    {editId && <button className="inv-cancel-btn" onClick={handleCancel}>Cancel</button>}
                  </div>
                </div>
                
                <div className="admin-card">
                  <h3 className="alerts-section-title">Current Inventory <span className="meta-badge" style={{ marginLeft: 8 }}>{items.length} items</span></h3>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Item Name</th><th>Category</th><th>Quantity</th><th>Expiry Date</th><th>Status Tag</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        let isExpired = false, daysLeft = null;

                        if (item.expiryDate) {
                          const [year, month, day] = item.expiryDate.slice(0, 10).split('-').map(Number);
                          const itemExpiry = new Date(year, month - 1, day); itemExpiry.setHours(0, 0, 0, 0);
                          daysLeft = Math.round((itemExpiry.getTime() - today.getTime()) / 86400000);
                          isExpired = itemExpiry < today;
                        }
                        const isLowStock = item.quantity < 10;
                        let statusLabel = "Fresh", badgeClass = "badge-fresh";

                        if (isExpired) { statusLabel = "Expired"; badgeClass = "badge-expired"; }
                        else if (daysLeft !== null && daysLeft <= 3) { statusLabel = "Expiring Soon"; badgeClass = "badge-expiring-soon"; }
                        else if (isLowStock) { statusLabel = "Low Stock"; badgeClass = "badge-low-stock"; }

                        return (
                          <tr key={item.id}>
                            <td><strong>{item.itemName}</strong></td>
                            <td>{item.category}</td>
                            <td><span className={isLowStock ? 'qty-low' : 'qty-ok'}>{item.quantity}</span></td>
                            <td>{item.expiryDate?.slice(0, 10)}{daysLeft !== null && !isExpired && ` (${daysLeft === 0 ? 'today' : `${daysLeft}d`})`}</td>
                            <td><span className={`status-tag ${badgeClass}`}>{statusLabel}</span></td>
                            <td>
                              <button className="inv-edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                              <button className="inv-delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'Approvals' && <ManageReservations />}
        {activeTab === 'Users'     && <ManageUsers />} 
        {activeTab === 'Chatbot'   && <ChatbotTab />}
      </main>
    </div>
  );
}

// ── Chatbot Tab Component ────────────────────────────────────────────────────
const ADMIN_SUGGESTIONS = ["What items should I restock this week?", "Which items are expiring soon?", "What categories are running low?", "Give me a full inventory summary."];
function ChatbotTab() {
  const [messages, setMessages] = useState([{ role: 'bot', text: "Hi! I'm your inventory advisor 📦 Ask me about restocking, demand trends, or which items need attention." }]);
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(text) {
    const query = text ?? input.trim(); if (!query || !query.trim() || loading) return;
    setInput(''); setMessages(prev => [...prev, { role: 'user', text: query }]); setLoading(true); 
    try {
      const res = await api.post('/api/ai/chat', { query, role: 'admin' });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply || 'No response.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Couldn't connect to AI service. Please confirm backend status settings." }]);
    } finally { setLoading(false); }
  }
  return (
    <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', height: '72vh' }}>
      {messages.length === 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {ADMIN_SUGGESTIONS.map(q => <button key={q} onClick={() => sendMessage(q)} disabled={loading} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #1b5e20', background: '#fff', color: '#1b5e20', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>{q}</button>)}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fafafa', marginBottom: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? '#1b5e20' : '#fff', color: msg.role === 'user' ? '#fff' : '#1a1a1a', border: msg.role === 'bot' ? '1px solid #e0e0e0' : 'none', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#fff', border: '1px solid #e0e0e0', color: '#999', fontSize: '0.9rem' }}>Thinking...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault() || sendMessage())} placeholder="e.g. What items should I restock this week?" disabled={loading} style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', outline: 'none' }} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: '12px 20px', borderRadius: '8px', background: '#1b5e20', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', opacity: loading || !input.trim() ? 0.6 : 1 }}>Send</button>
      </div>
    </div>
  );
}