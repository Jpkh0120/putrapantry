import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ManageReservations() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingCartId, setProcessingCartId] = useState(null);

  useEffect(() => {
    fetchAllReservations();
  }, []);

  async function fetchAllReservations() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/reservation/admin/all');
      const grouped = groupByStudent(res.data);
      setCarts(grouped);
    } catch (e) {
      setError('Failed to load student reservations.');
    } finally {
      setLoading(false);
    }
  }

  function groupByStudent(flatReservations) {
    const map = {};

    flatReservations.forEach(resItem => {
      if (!resItem.reservedAt) return;

      const dateObj = new Date(resItem.reservedAt);
      dateObj.setSeconds(0);
      dateObj.setMilliseconds(0);
      const isoMinuteString = dateObj.toISOString();

      const groupKey = `${resItem.studentName || resItem.studentId}_${isoMinuteString}`;

      if (!map[groupKey]) {
        map[groupKey] = {
          reservedAt: isoMinuteString,
          studentName: resItem.studentName || 'Unknown Student',
          studentId: resItem.studentId,
          cartId: resItem.id,
          status: resItem.status,
          items: []
        };
      }

      map[groupKey].items.push({
        id: resItem.id,
        itemName: resItem.item || 'Unknown Item',
        quantity: resItem.quantity,
        itemStatus: resItem.status
      });
    });

    return Object.values(map).sort((a, b) => new Date(a.reservedAt) - new Date(b.reservedAt));
  }

  async function handleApproveCart(cart) {
    if (!window.confirm(`Approve all items for ${cart.studentName}?`)) return;
    setProcessingCartId(cart.reservedAt);
    try {
      await Promise.all(
        cart.items
          .filter(i => i.itemStatus === 'pending')
          .map(i => api.put(`/api/reservation/approve/${i.id}`))
      );
      alert('Cart approved!');
      await fetchAllReservations();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to approve.');
    } finally {
      setProcessingCartId(null);
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading reservations...</div>;
  if (error)   return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '10px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>📋 Student Pickup Approvals</h2>
        <button
          onClick={fetchAllReservations}
          style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
        >
          🔄 Refresh List
        </button>
      </div>

      {/* EMPTY STATE */}
      {carts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '2px dashed #ccc', borderRadius: '6px', color: '#666', background: '#fff' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>No pending reservations at the moment.</p>
        </div>
      ) : (
        carts.map((cart) => {
          const dateObj = cart.reservedAt ? new Date(cart.reservedAt) : null;
          const displayDate = dateObj ? dateObj.toLocaleDateString() : '—';
          const displayTime = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const isProcessing = processingCartId === cart.reservedAt;

          return (
            <div
              key={`${cart.studentId}_${cart.reservedAt}`}
              style={{
                border: '1px solid #1a1a1a',
                borderRadius: '6px',
                padding: '24px',
                marginBottom: '32px',
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              {/* METADATA HEADER */}
              <div style={{ display: 'flex', gap: '32px', marginBottom: '20px', fontSize: '1.05rem', color: '#000', flexWrap: 'wrap' }}>
                <div><strong>Student:</strong> {cart.studentName}</div>
                <div><strong>Date:</strong> {displayDate}</div>
                <div><strong>Time:</strong> {displayTime}</div>
              </div>

              {/* ITEMS BOX */}
              <div style={{
                border: '1px solid #000',
                padding: '14px 20px',
                borderRadius: '4px',
                marginBottom: '24px',
                background: '#fafafa'
              }}>
                {cart.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: idx !== cart.items.length - 1 ? '1px dashed #ddd' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '1.05rem', color: item.itemStatus === 'cancelled' ? '#aaa' : '#000' }}>
                      {idx + 1}.{' '}
                      <span style={{
                        textDecoration: item.itemStatus === 'cancelled' ? 'line-through' : 'none',
                        marginLeft: '6px',
                        fontWeight: '500'
                      }}>
                        {item.itemName}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '8px' }}>(x{item.quantity})</span>
                    </div>

                    {item.itemStatus === 'cancelled' ? (
                      <span style={{ color: '#d32f2f', fontSize: '0.85rem', fontWeight: 'bold', background: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>[ Cancelled ]</span>
                    ) : (
                      <span style={{ color: '#2e7d32', fontSize: '0.85rem', fontWeight: 'bold', background: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' }}>✓ Active</span>
                    )}
                  </div>
                ))}
              </div>

              {/* BOTTOM ACTION */}
              {/* BOTTOM ACTION */}
<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
  <div style={{ fontSize: '0.95rem' }}>
    <strong>Status:</strong>{' '}
    <span style={{
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      background: '#fff3e0',
      color: '#e65100',
      border: '1px solid'
    }}>
      PENDING
    </span>
  </div>

  {/* REJECT BUTTON */}
  <button
    onClick={() => handleRejectCart(cart)}
    disabled={isProcessing}
    style={{
      fontSize: '1.1rem',
      fontWeight: 'bold',
      color: '#c62828',
      border: '2px solid #c62828',
      padding: '6px 24px',
      borderRadius: '4px',
      background: '#fff',
      textTransform: 'uppercase',
      cursor: 'pointer',
      letterSpacing: '0.5px'
    }}
  >
    {isProcessing ? '...' : '✕ REJECT'}
  </button>

  {/* APPROVE BUTTON */}
  <button
    onClick={() => handleApproveCart(cart)}
    disabled={isProcessing}
    style={{
      fontSize: '1.1rem',
      fontWeight: 'bold',
      color: '#fff',
      border: '2px solid #1b5e20',
      padding: '6px 24px',
      borderRadius: '4px',
      background: '#1b5e20',
      textTransform: 'uppercase',
      cursor: 'pointer',
      letterSpacing: '0.5px'
    }}
  >
    {isProcessing ? '...' : '✓ APPROVE'}
  </button>
</div>

            </div>
          );
        })
      )}
    </div>
  );
  // Add this alongside handleApproveCart
async function handleRejectCart(cart) {
  if (!window.confirm(`Reject all items for ${cart.studentName}? Stock will be returned.`)) return;
  setProcessingCartId(cart.reservedAt);
  try {
    await Promise.all(
      cart.items
        .filter(i => i.itemStatus === 'pending')
        .map(i => api.put(`/api/reservation/reject/${i.id}`))
    );
    alert('Cart rejected and stock returned.');
    await fetchAllReservations();
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to reject.');
  } finally {
    setProcessingCartId(null);
  }
}
}