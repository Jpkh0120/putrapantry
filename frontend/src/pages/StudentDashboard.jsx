// src/pages/StudentDashboard.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StockView from '../components/student/StockView'; // Your actual working component
import './StudentDashboard.css';

// Temporary inline placeholders for the components you haven't created yet
function ReservationForm({ preselectedItem, onSuccess }) {
  return (
    <div className="card">
      <h2>📋 Make a Reservation</h2>
      {preselectedItem ? (
        <div className="alert alert-info">
          Reserving: <strong>{preselectedItem.name || 'Selected Item'}</strong>
        </div>
      ) : (
        <p className="empty-state">No item selected. Go to the Stock tab to pick food items.</p>
      )}
      <div className="form-group" style={{ marginTop: '15px' }}>
        <button className="submit-btn" onClick={onSuccess} disabled={!preselectedItem}>
          Confirm Mock Reservation
        </button>
      </div>
    </div>
  );
}

function PickupHistory() {
  return (
    <div className="card">
      <h2>🕐 Your Pickup History</h2>
      <p className="empty-state">You have no active or past food reservations yet.</p>
    </div>
  );
}

function Chatbot() {
  return (
    <div className="card chatbot-container">
      <h2>🤖 PutraPantry Assistant</h2>
      <div className="chat-messages">
        <div className="chat-msg bot">Hi! I am your AI assistant. Ask me anything about today's food distribution or inventory!</div>
      </div>
      <div className="chat-input-row">
        <input type="text" className="chat-input" placeholder="Type a message..." disabled />
        <button className="chat-send-btn" disabled>Send</button>
      </div>
    </div>
  );
}

const TABS = ['Stock', 'Reserve', 'History', 'Chatbot'];

export default function StudentDashboard() {
  const { currentUser, userName, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Stock');
  const [selectedItem, setSelectedItem] = useState(null);

  async function handleLogout() {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  function handleReserve(item) {
    setSelectedItem(item);
    setActiveTab('Reserve');
  }

  return (
    <div className="dashboard">
      {/* Header */}
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

      {/* Tabs */}
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
            {tab === 'Stock' && '📦 '}
            {tab === 'Reserve' && '📋 '}
            {tab === 'History' && '🕐 '}
            {tab === 'Chatbot' && '🤖 '}
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="dashboard-content">
        {activeTab === 'Stock'   && <StockView onReserve={handleReserve} />}
        {activeTab === 'Reserve' && <ReservationForm preselectedItem={selectedItem} onSuccess={() => setActiveTab('History')} />}
        {activeTab === 'History' && <PickupHistory />}
        {activeTab === 'Chatbot' && <Chatbot />}
      </main>
    </div>
  );
}