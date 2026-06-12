import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StockView from '../components/student/StockView';
import ReservationForm from '../components/student/ReservationForm';
import PickupHistory from '../components/student/PickupHistory';
import Chatbot from '../components/student/Chatbot';
import api from '../services/api'; 
import { auth } from '../config/firebase'; 
import './StudentDashboard.css';

const TABS = ['Stock', 'Reserve', 'History', 'Chatbot'];

export default function StudentDashboard() {
  const { userName, isVerified, logout } = useAuth();
  const [activeTab, setActiveTab]     = useState('Stock');
  const [selectedItem, setSelectedItem] = useState(null);
  const [checking, setChecking] = useState(false); 

  // Global inventory states for tracking marketplace data
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch the latest stock lists automatically when a verified student enters the shell
  async function fetchMarketplaceStock() {
    if (!isVerified) return;
    setLoadingItems(true);
    try {
      const res = await api.get('/api/inventory');
      
      // 🌟 FRONTEND ONLY SAFETY FILTER: Identify and flag expired items before passing down
      const processedItems = res.data.map(item => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let isExpired = false;
        if (item.expiryDate) {
          const [year, month, day] = item.expiryDate.slice(0, 10).split('-').map(Number);
          const itemExpiry = new Date(year, month - 1, day);
          itemExpiry.setHours(0, 0, 0, 0);
          isExpired = itemExpiry < today;
        }

        return {
          ...item,
          isExpired // Appends explicit boolean safety flag to item payload matrix
        };
      });

      setInventoryItems(processedItems);
    } catch (err) {
      console.error("Failed to extract active stock entries:", err);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    fetchMarketplaceStock();
  }, [isVerified, activeTab]);

  async function handleLogout() {
    try { await logout(); window.location.href = '/login'; }
    catch (e) { console.error(e); }
  }

  async function handleCheckStatus() {
    try {
      setChecking(true);
      
      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true);
      }

      const res = await api.get('/api/auth/me');
      
      if (res.data && res.data.isVerified) {
        localStorage.setItem('isVerified', 'true');
        alert('Verification confirmed! Welcome to PutraPantry.');
        window.location.reload(); 
      } else {
        alert('Account status is still pending admin approval. Please wait a moment.');
      }
    } catch (err) {
      console.error('Error re-verifying status:', err);
      
      const errorCode = err?.code || '';
      const errorMsg = err?.message || '';
      const isSuspended = 
        errorCode.includes('user-disabled') || 
        errorMsg.toLowerCase().includes('disabled') || 
        err?.response?.status === 403;

      if (isSuspended) {
        alert('❌ Access Denied: Your account has been suspended by an administrator. Please contact pantry management.');
        await logout();
        window.location.href = '/login';
      } else {
        alert('Could not verify status. Please ensure the backend server is running.');
      }
    } finally {
      setChecking(false);
    }
  }

  function handleReserve(item) {
    setSelectedItem(item);
    setActiveTab('Reserve');
  }

  // Render verification barrier if account is not approved yet
  if (!isVerified) {
    return (
      <div className="dashboard" style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <header className="dashboard-header">
          <div className="header-left">
            <h1>🥗 PutraPantry</h1>
            <span className="role-badge">Student</span>
          </div>
          <div className="header-right">
            <span className="user-email">👤 {userName || 'Student'}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div style={{ maxWidth: '580px', margin: '80px auto', padding: '40px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#e65100', margin: '0 0 14px 0', fontWeight: '700' }}>Account Pending Verification</h2>
          <p style={{ color: '#4a5568', lineHeight: '1.6', margin: '0 0 24px 0', fontSize: '1.05rem' }}>
            Hello <strong>{userName || 'Student'}</strong>, your account was registered successfully! However, before you can browse active inventory stocks or place pantry reservations, an administrator must verify your application profile registry.
          </p>
          <div style={{ padding: '12px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '6px', color: '#e65100', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Status: Pending Admin Approval
          </div>
          
          <button 
            onClick={handleCheckStatus} 
            disabled={checking}
            style={{ 
              padding: '12px 28px', 
              background: checking ? '#999' : '#1b5e20', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              cursor: checking ? 'not-allowed' : 'pointer', 
              fontSize: '0.95rem',
              boxShadow: '0 2px 6px rgba(27,94,32,0.2)'
            }}
          >
            {checking ? 'Checking...' : '🔄 Check Status'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🥗 PutraPantry</h1>
          <span className="role-badge">Student</span>
        </div>
        <div className="header-right">
          <span className="user-email">👤 {userName || 'Student'}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab !== 'Reserve') setSelectedItem(null);
            }}
          >
            {tab === 'Stock'   && '📦 '}
            {tab === 'Reserve' && '📋 '}
            {tab === 'History' && '🕐 '}
            {tab === 'Chatbot' && '🤖 '}
            {tab}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        {activeTab === 'Stock' && (
          loadingItems ? (
            <div className="admin-loading" style={{ textAlign: 'center', padding: '40px' }}>Loading available food stocks...</div>
          ) : (
            /* 🌟 FIXED: Reference locally scoped fetchMarketplaceStock handler */
            <StockView 
              items={inventoryItems} 
              onReserve={handleReserve} 
              refreshStock={fetchMarketplaceStock}
            />
          )
        )}
        
        {activeTab === 'Reserve' && (
          <ReservationForm preselectedItem={selectedItem} onSuccess={() => setActiveTab('History')} />
        )}
        
        {activeTab === 'History' && <PickupHistory />}
        {activeTab === 'Chatbot' && <Chatbot />}
      </main>
    </div>
  );
}