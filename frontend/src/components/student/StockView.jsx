import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function StockView({ onReserve }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      const res = await api.get('/api/inventory');
      setItems(res.data);
    } catch (err) {
      setError('Failed to load inventory. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  // Helper helper to check if an item is within 3 days of expiring
  function isExpiringSoon(expiryDate) {
    if (!expiryDate) return false;
    const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  }

  // New helper to evaluate if an item has explicitly expired past today
  function isExpired(expiryDate) {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time parameters to perform an accurate date comparison
    
    const itemExpiry = new Date(expiryDate);
    return itemExpiry < today;
  }

  function isLowStock(qty) {
    return qty < 10;
  }

  const filtered = items.filter(item =>
    item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner">Loading stock...</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>📦 Available Stock</h2>
          <button onClick={fetchInventory} style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem' }}>
            🔄 Refresh
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by item name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 16, fontSize: '0.9rem' }}
        />

        {filtered.length === 0 ? (
          <div className="empty-state"><p>No items found.</p></div>
        ) : (
          <div className="stock-grid">
            {filtered.map(item => {
              // 🌟 STEP 1: Pre-calculate states for button management logic flags
              const expired = isExpired(item.expiryDate);
              const outOfStock = item.quantity === 0;
              const shouldDisable = outOfStock || expired;

              // 🌟 STEP 2: Dynamically change the button text depending on inventory state priority
              let buttonText = 'Reserve';
              if (outOfStock) {
                buttonText = 'Out of Stock';
              } else if (expired) {
                buttonText = 'Expired';
              }

              return (
                <div key={item.id} className="stock-card">
                  <div className="category">{item.category}</div>
                  <h3>{item.itemName}</h3>
                  
                  {/* Keep low stock warning class if quantities are sparse */}
                  <div className={`quantity ${isLowStock(item.quantity) ? 'low' : ''}`}>
                    {item.quantity} units
                  </div>
                  
                  {/* Highlight expiry details if item is already past its usable shelf life */}
                  <div className={`expiry ${expired ? 'expired' : isExpiringSoon(item.expiryDate) ? 'soon' : ''}`}>
                    {(expired || isExpiringSoon(item.expiryDate)) ? '⚠️ ' : ''}
                    {expired ? `Expired on: ${item.expiryDate}` : `Expires: ${item.expiryDate}`}
                  </div>

                  {isLowStock(item.quantity) && !expired && (
                    <div style={{ fontSize: '0.75rem', color: '#e65100', marginTop: 4 }}>⚠️ Low stock</div>
                  )}

                  {/* 🌟 STEP 3: Pass down disabled flag attributes and handle styles */}
                  <button
                    className={`reserve-btn ${expired ? 'expired-btn' : ''}`}
                    disabled={shouldDisable}
                    onClick={() => onReserve(item)}
                    style={{
                      // Fallback inline styling flags if your global stylesheet overrides classes
                      backgroundColor: shouldDisable ? (expired ? '#fca5a5' : '#e2e8f0') : '#2e7d32',
                      color: shouldDisable ? (expired ? '#b91c1c' : '#94a3b8') : '#ffffff',
                      cursor: shouldDisable ? 'not-allowed' : 'pointer'
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