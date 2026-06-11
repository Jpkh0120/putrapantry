// src/components/student/StockView.jsx
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

  function isExpiringSoon(expiryDate) {
    const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days <= 3;
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
            {filtered.map(item => (
              <div key={item.id} className="stock-card">
                <div className="category">{item.category}</div>
                <h3>{item.itemName}</h3>
                <div className={`quantity ${isLowStock(item.quantity) ? 'low' : ''}`}>
                  {item.quantity} units
                </div>
                <div className={`expiry ${isExpiringSoon(item.expiryDate) ? 'soon' : ''}`}>
                  {isExpiringSoon(item.expiryDate) ? '⚠️ ' : ''}Expires: {item.expiryDate}
                </div>
                {isLowStock(item.quantity) && (
                  <div style={{ fontSize: '0.75rem', color: '#e65100', marginTop: 4 }}>⚠️ Low stock</div>
                )}
                <button
                  className="reserve-btn"
                  disabled={item.quantity === 0}
                  onClick={() => onReserve(item)}
                >
                  {item.quantity === 0 ? 'Out of Stock' : 'Reserve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}