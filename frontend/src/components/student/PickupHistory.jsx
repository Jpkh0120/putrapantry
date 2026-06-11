import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PickupHistory() {
  const { currentUser } = useAuth();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [viewMode, setViewMode] = useState('reservation'); 
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [collectingCartId, setCollectingCartId] = useState(null);

  useEffect(() => {
    fetchReservationHistory();
  }, []);

  async function fetchReservationHistory() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/reservation/${currentUser.uid}`);
      const groupedCarts = groupItemsByTimestamp(res.data);
      setCarts(groupedCarts);
    } catch (e) {
      setError('Failed to load reservation history.');
    } finally {
      setLoading(false);
    }
  }

  function groupItemsByTimestamp(flatReservations) {
    const map = {};

    flatReservations.forEach(resItem => {
      if (!resItem.reservedAt) return;

      const dateObj = new Date(resItem.reservedAt);
      dateObj.setSeconds(0);
      dateObj.setMilliseconds(0);
      const isoMinuteString = dateObj.toISOString();
      const displayKey = dateObj.toLocaleString([], { 
        year: 'numeric', month: 'numeric', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
      
      if (!map[displayKey]) {
        map[displayKey] = {
          id: resItem.id,
          reservedAt: isoMinuteString,
          status: resItem.status,
          items: []
        };
      }
      
      map[displayKey].items.push({
        id: resItem.id,
        itemId: resItem.itemId,
        itemName: resItem.item || 'Unknown Item',
        quantity: resItem.quantity,
        itemStatus: resItem.status
      });
    });

    const finalGroups = Object.values(map).map(cart => {
      const allCancelled = cart.items.every(i => i.itemStatus === 'cancelled');
      const allRejected  = cart.items.every(i => i.itemStatus === 'rejected');
      if (allCancelled) return { ...cart, status: 'cancelled' };
      if (allRejected)  return { ...cart, status: 'rejected' };
      return cart;
    });

    return finalGroups.sort((a, b) => new Date(b.reservedAt) - new Date(a.reservedAt));
  }

  async function handleCancelItem(id) {
    if (!window.confirm('Cancel this specific item?')) return;
    setCancellingItemId(id);
    try {
      await api.put(`/api/reservation/cancel/${id}`);
      alert('Item successfully cancelled!');
      await fetchReservationHistory();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to cancel item.');
    } finally {
      setCancellingItemId(null);
    }
  }

  async function handleStudentCollect(rawReservedAt, itemsArray) {
    if (!window.confirm('Confirm that you have physically collected this entire pantry cart?')) return;
    
    const activeItem = itemsArray.find(i => i.itemStatus !== 'cancelled' && i.itemStatus !== 'rejected');
    if (!activeItem) {
      alert("Cannot collect an empty, cancelled, or rejected cart.");
      return;
    }

    setCollectingCartId(rawReservedAt);
    try {
      await api.put('/api/reservation/student-collect-group', { reservedAt: rawReservedAt });
      alert('Receipt successfully marked as COLLECTED!');
      await fetchReservationHistory();
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.message || 'Failed to update collection confirmation.');
    } finally {
      setCollectingCartId(null);
    }
  }

  // ── FILTER by tab ──
  const filteredCarts = carts.filter(cart => {
    if (viewMode === 'reservation') {
      return cart.status === 'pending' || cart.status === 'approved';
    } else {
      return cart.status === 'collected' || cart.status === 'cancelled' || cart.status === 'rejected';
    }
  });

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '10px' }}>
      
      {/* ── SUB-NAVBAR TABS ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => setViewMode('reservation')}
          style={{
            padding: '10px 20px', borderRadius: '6px', border: '2px solid #1b5e20',
            background: viewMode === 'reservation' ? '#1b5e20' : '#fff',
            color: viewMode === 'reservation' ? '#fff' : '#1b5e20',
            fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          Reservation
        </button>
        <button 
          onClick={() => setViewMode('collected')}
          style={{
            padding: '10px 20px', borderRadius: '6px', border: '2px solid #1b5e20',
            background: viewMode === 'collected' ? '#1b5e20' : '#fff',
            color: viewMode === 'collected' ? '#fff' : '#1b5e20',
            fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          History
        </button>
        <button onClick={fetchReservationHistory} style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '0 16px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── CARD FEED ── */}
      {filteredCarts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '2px dashed #ccc', borderRadius: '6px', color: '#666', background: '#fff' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>No records found here.</p>
        </div>
      ) : (
        filteredCarts.map((cart) => {
          const dateObj = cart.reservedAt ? new Date(cart.reservedAt) : null;
          const displayDate = dateObj ? dateObj.toLocaleDateString() : '—';
          const displayTime = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

          return (
            <div key={cart.reservedAt} style={{ border: '1px solid #1a1a1a', borderRadius: '6px', padding: '24px', marginBottom: '32px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              
              {/* METADATA */}
              <div style={{ display: 'flex', gap: '32px', marginBottom: '20px', fontSize: '1.05rem', color: '#000', flexWrap: 'wrap' }}>
                <div><strong>Date:</strong> {displayDate}</div>
                <div><strong>Time:</strong> {displayTime}</div>
                <div><strong>Reservation ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cart.id.slice(0, 5).toUpperCase()}</span></div>
              </div>

              {/* ITEMS BOX */}
              <div style={{ border: '1px solid #000', padding: '14px 20px', borderRadius: '4px', marginBottom: '24px', background: '#fafafa' }}>
                {cart.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx !== cart.items.length - 1 ? '1px dashed #ddd' : 'none' }}>
                    <div style={{ fontSize: '1.05rem', color: (item.itemStatus === 'cancelled' || item.itemStatus === 'rejected') ? '#aaa' : '#000' }}>
                      {idx + 1}.{' '}
                      <span style={{ textDecoration: (item.itemStatus === 'cancelled' || item.itemStatus === 'rejected') ? 'line-through' : 'none', marginLeft: '6px', fontWeight: '500' }}>
                        {item.itemName}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '8px' }}>(x{item.quantity})</span>
                    </div>

                    <div>
                      {item.itemStatus === 'cancelled' ? (
                        <span style={{ color: '#d32f2f', fontSize: '0.85rem', fontWeight: 'bold', background: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>[ Cancelled ]</span>
                      ) : item.itemStatus === 'rejected' ? (
                        <span style={{ color: '#b71c1c', fontSize: '0.85rem', fontWeight: 'bold', background: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>[ Rejected ]</span>
                      ) : cart.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelItem(item.id)}
                          disabled={cancellingItemId === item.id}
                          style={{ background: '#fff', border: '1px solid #d32f2f', color: '#d32f2f', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          {cancellingItemId === item.id ? '...' : '✕ Cancel'}
                        </button>
                      ) : (
                        <span style={{ color: '#2e7d32', fontSize: '0.85rem', fontWeight: 'bold', background: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' }}>✓ Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTTOM ACTION */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ fontSize: '0.95rem' }}>
                  <strong>Approval Status:</strong>{' '}
                  <span style={{
                    padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid',
                    background: cart.status === 'pending' ? '#fff3e0' : cart.status === 'rejected' ? '#ffebee' : cart.status === 'cancelled' ? '#ffebee' : '#e8f5e9',
                    color:      cart.status === 'pending' ? '#e65100' : cart.status === 'rejected' ? '#c62828' : cart.status === 'cancelled' ? '#c62828' : '#2e7d32',
                  }}>
                    {cart.status.toUpperCase()}
                  </span>
                </div>

                {/* DYNAMIC ACTION BUTTON */}
                {cart.status === 'pending' ? (
                  <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#e65100' }}>
                    Awaiting admin approval...
                  </div>
                ) : cart.status === 'cancelled' ? (
                  <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#c62828', border: '2px solid #c62828', padding: '6px 24px', borderRadius: '4px', background: '#fff', textTransform: 'uppercase', userSelect: 'none' }}>
                    CANCELLED
                  </div>
                ) : cart.status === 'rejected' ? (
                  <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#c62828', border: '2px solid #c62828', padding: '6px 24px', borderRadius: '4px', background: '#fff', textTransform: 'uppercase', userSelect: 'none' }}>
                    ✕ REJECTED
                  </div>
                ) : cart.status === 'collected' ? (
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#94a3b8', border: '2px solid #cbd5e1', padding: '6px 24px', borderRadius: '4px', background: '#f8fafc', textTransform: 'uppercase', userSelect: 'none' }}>
                    ✓ COLLECTED
                  </div>
                ) : (
                  <button
                    onClick={() => handleStudentCollect(cart.reservedAt, cart.items)}
                    disabled={collectingCartId === cart.reservedAt}
                    style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', border: '2px solid #2e7d32', padding: '6px 24px', borderRadius: '4px', background: '#2e7d32', textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.5px' }}
                  >
                    {collectingCartId === cart.reservedAt ? '...' : 'COLLECT'}
                  </button>
                )}
              </div>

            </div>
          );
        })
      )}
    </div>
  );
}