// src/pages/StudentDashboard.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StockView from '../components/student/StockView';
import ReservationForm from '../components/student/ReservationForm';
import PickupHistory from '../components/student/PickupHistory';
import Chatbot from '../components/student/Chatbot';
import './StudentDashboard.css';

const TABS = ['Stock', 'Reserve', 'History', 'Chatbot'];

export default function StudentDashboard() {
  const { userName, logout } = useAuth();
  const [activeTab, setActiveTab]     = useState('Stock');
  const [selectedItem, setSelectedItem] = useState(null);

  async function handleLogout() {
    try { await logout(); window.location.href = '/login'; }
    catch (e) { console.error(e); }
  }

  function handleReserve(item) {
    setSelectedItem(item);
    setActiveTab('Reserve');
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
        {activeTab === 'Stock'   && <StockView onReserve={handleReserve} />}
        {activeTab === 'Reserve' && <ReservationForm preselectedItem={selectedItem} onSuccess={() => setActiveTab('History')} />}
        {activeTab === 'History' && <PickupHistory />}
        {activeTab === 'Chatbot' && <Chatbot />}
      </main>
    </div>
  );
}