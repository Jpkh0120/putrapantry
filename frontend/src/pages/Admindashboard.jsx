// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminDashboard.css';

const AI_BASE_URL = 'http://localhost:8000';
const TABS = ['Forecast', 'Alerts', 'Inventory'];
const CATEGORIES = ['Grains & Rice', 'Canned Goods', 'Dairy', 'Fresh Produce', 'Protein', 'Beverages', 'Snacks', 'Other'];

// ── Demand Forecast Tab ──────────────────────────────────────────────────────

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
    </div>
  );
}

// ── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${AI_BASE_URL}/ai/expiry-alerts`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="admin-loading">Checking inventory...</div>;
  if (error)   return <div className="admin-error">Failed to load alerts: {error}</div>;
  if (!data)   return null;

  return (
    <div className="alerts-wrapper">
      <div className="admin-card">
        <h3 className="alerts-section-title">
          Expiring Soon
          <span className="alert-count expiry">{data.expiryAlerts.length}</span>
        </h3>
        {data.expiryAlerts.length === 0 ? (
          <p className="admin-empty">No items expiring within the warning window.</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Item</th><th>Expiry Date</th><th>Days Left</th><th>Qty</th></tr></thead>
            <tbody>
              {data.expiryAlerts.map((a, i) => (
                <tr key={i}>
                  <td>{a.itemName}</td>
                  <td>{a.expiryDate?.slice(0, 10)}</td>
                  <td><span className={`days-badge ${a.daysLeft <= 1 ? 'critical' : 'warning'}`}>{a.daysLeft}d</span></td>
                  <td>{a.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card">
        <h3 className="alerts-section-title">
          Low Stock
          <span className="alert-count low">{data.lowStockAlerts.length}</span>
        </h3>
        {data.lowStockAlerts.length === 0 ? (
          <p className="admin-empty">All items are above the minimum threshold.</p>
        ) : (
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

// ── Inventory Tab ────────────────────────────────────────────────────────────

const EMPTY_FORM = { itemName: '', quantity: '', expiryDate: '', category: '' };

function InventoryTab() {
  const [items, setItems] = useState([]);
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

  async function loadInventory() {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory');
      setItems(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInventory(); }, []);

  function handleEdit(item) {
    setEditId(item.id);
    setForm({
      itemName: item.itemName,
      quantity: item.quantity,
      expiryDate: item.expiryDate?.slice(0, 10) || '',
      category: item.category,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancel() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    const { itemName, quantity, expiryDate, category } = form;
    if (!itemName || quantity === '' || !expiryDate || !category) {
      showFeedback('All fields are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/api/inventory/update/${editId}`, { ...form, quantity: Number(quantity) });
        showFeedback('Item updated successfully.');
      } else {
        await api.post('/api/inventory/add', { ...form, quantity: Number(quantity) });
        showFeedback('Item added successfully.');
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      await loadInventory();
    } catch (e) {
      showFeedback(e.response?.data?.error || e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item from inventory?')) return;
    try {
      await api.delete(`/api/inventory/delete/${id}`);
      showFeedback('Item deleted.');
      await loadInventory();
    } catch (e) {
      showFeedback(e.response?.data?.error || e.message, 'error');
    }
  }

  return (
    <div>
      {feedback && (
        <div className={`inv-feedback ${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* Add / Edit Form */}
      <div className="admin-card inv-form-card">
        <h3 className="inv-form-title">{editId ? 'Edit Item' : 'Add New Item'}</h3>
        <div className="inv-form-grid">
          <div className="inv-field">
            <label>Item Name</label>
            <input
              type="text"
              placeholder="e.g. Jasmine Rice"
              value={form.itemName}
              onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
            />
          </div>
          <div className="inv-field">
            <label>Quantity</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div className="inv-field">
            <label>Expiry Date</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>
          <div className="inv-field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="inv-form-actions">
          <button className="inv-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editId ? 'Update Item' : 'Add Item'}
          </button>
          {editId && (
            <button className="inv-cancel-btn" onClick={handleCancel}>Cancel</button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="admin-card">
        <h3 className="alerts-section-title">
          Current Inventory
          <span className="meta-badge" style={{ marginLeft: 8 }}>{items.length} items</span>
        </h3>

        {loading ? (
          <div className="admin-loading">Loading inventory...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : items.length === 0 ? (
          <p className="admin-empty">No items in inventory yet. Add one above.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const daysLeft = item.expiryDate
                  ? Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000)
                  : null;
                return (
                  <tr key={item.id}>
                    <td><strong>{item.itemName}</strong></td>
                    <td>{item.category}</td>
                    <td>
                      <span className={item.quantity < 10 ? 'qty-low' : 'qty-ok'}>
                        {item.quantity}
                      </span>
                    </td>
                    <td>
                      {item.expiryDate?.slice(0, 10)}
                      {daysLeft !== null && daysLeft <= 3 && (
                        <span className={`days-badge ${daysLeft <= 1 ? 'critical' : 'warning'}`} style={{ marginLeft: 6 }}>
                          {daysLeft}d
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="inv-edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="inv-delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Admin Dashboard Shell ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { userName, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Inventory');

  async function handleLogout() {
    try { await logout(); window.location.href = '/login'; }
    catch (e) { console.error(e); }
  }

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
          <button
            key={tab}
            className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Forecast'  && '📈 '}
            {tab === 'Alerts'    && '🔔 '}
            {tab === 'Inventory' && '📦 '}
            {tab}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        <div className="admin-section-header">
          <h2>
            {activeTab === 'Forecast'  && '7-Day Demand Forecast'}
            {activeTab === 'Alerts'    && 'Inventory Alerts'}
            {activeTab === 'Inventory' && 'Inventory Management'}
          </h2>
          <p className="admin-section-sub">
            {activeTab === 'Forecast'  && 'Linear regression predictions based on pickup history'}
            {activeTab === 'Alerts'    && 'Rule-based checks for expiry and low stock'}
            {activeTab === 'Inventory' && 'Add, edit, and remove items from the food bank'}
          </p>
        </div>

        {activeTab === 'Forecast'  && <ForecastTab />}
        {activeTab === 'Alerts'    && <AlertsTab />}
        {activeTab === 'Inventory' && <InventoryTab />}
      </main>
    </div>
  );
}