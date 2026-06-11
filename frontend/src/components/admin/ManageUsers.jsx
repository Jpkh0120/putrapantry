import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ManageUsers() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  // 🌟 FIXED: Hits /api/admin/students directly (matching server.js mount point)
  async function fetchStudents() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/admin/students');
      setStudents(res.data);
    } catch (err) {
      setError('Failed to load student account registries.');
    } finally {
      setLoading(false);
    }
  }

  // 🌟 FIXED: Toggles the isVerified flag on the backend
  async function handleToggleVerify(uid, currentIsVerified) {
    const nextVerifyState = !currentIsVerified;
    if (!window.confirm(`Change student verification status to ${nextVerifyState ? 'VERIFIED' : 'PENDING'}?`)) return;

    try {
      await api.put(`/api/admin/verify/${uid}`, { isVerified: nextVerifyState });
      alert('Verification status updated successfully!');
      fetchStudents(); // Refresh data grid
    } catch (err) {
      alert('Failed to update student verification status.');
    }
  }

  // 🌟 FIXED: Suspends or reactivates login credentials and Firestore status
  async function handleToggleSuspend(uid, currentStatus) {
    const isCurrentlySuspended = currentStatus === 'suspended';
    const nextSuspendState = !isCurrentlySuspended;
    
    const confirmMessage = nextSuspendState 
      ? 'Are you sure you want to SUSPEND this student? They will be blocked from logging in.' 
      : 'Are you sure you want to REACTIVATE this student account?';

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/api/admin/suspend/${uid}`, { isSuspended: nextSuspendState });
      alert(nextSuspendState ? 'Account suspended successfully!' : 'Account reactivated successfully!');
      fetchStudents();
    } catch (err) {
      alert('Failed to modify account suspension state.');
    }
  }

  // 🌟 FIXED: Completely purges the student from Auth and Firestore
  async function handleDeleteStudent(uid) {
    if (!window.confirm('CRITICAL ACTION: Permanently delete this student from both authentication credentials and database profiles? This cannot be undone.')) return;

    try {
      await api.delete(`/api/admin/delete/${uid}`);
      alert('Student profile successfully purged from system registries.');
      fetchStudents();
    } catch (err) {
      alert('Failed to completely delete user account.');
    }
  }

  return (
    <div style={{ maxWidth: '950px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1b5e20' }}>User Account Management</h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem' }}>Verify, suspend, reactivate, or delete student profiles.</p>
        </div>
        <button 
          onClick={fetchStudents} 
          disabled={loading}
          style={{ padding: '10px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 Refresh Roster
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '6px', marginBottom: '20px', fontWeight: '500' }}>
          ⚠️ {error}
        </div>
      )}

      {/* DATA TABLE CONTAINER */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontWeight: '500' }}>Loading student account profiles...</div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', border: '2px dashed #ccc', borderRadius: '8px', color: '#666' }}>
          No registered student accounts found in the system.
        </div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.9rem', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Student Name</th>
                <th style={{ padding: '14px 16px' }}>Email Address</th>
                <th style={{ padding: '14px 16px' }}>Verification</th>
                <th style={{ padding: '14px 16px' }}>Status Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const isSuspended = student.status === 'suspended';
                
                return (
                  <tr key={student.uid} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.95rem' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1a202c' }}>{student.name || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#4a5568' }}>{student.email}</td>
                    
                    {/* VERIFICATION COLUMN */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: student.isVerified ? '#e8f5e9' : '#fff3e0',
                        color: student.isVerified ? '#2e7d32' : '#e65100',
                        border: '1px solid'
                      }}>
                        {student.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>

                    {/* STATUS STATUS COLUMN */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: isSuspended ? '#ffebee' : '#e8f5e9',
                        color: isSuspended ? '#c62828' : '#2e7d32'
                      }}>
                        {(student.status || 'active').toUpperCase()}
                      </span>
                    </td>

                    {/* ACTIONS BUTTON GROUP */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        
                        {/* 1. Verify Action Switcher */}
                        <button
                          onClick={() => handleToggleVerify(student.uid, student.isVerified)}
                          style={{
                            padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #ccc', cursor: 'pointer',
                            background: student.isVerified ? '#fff' : '#2e7d32',
                            color: student.isVerified ? '#333' : '#fff',
                          }}
                        >
                          {student.isVerified ? 'Unverify' : 'Verify'}
                        </button>

                        {/* 2. Suspend/Unsuspend Toggle Action */}
                        <button
                          onClick={() => handleToggleSuspend(student.uid, student.status)}
                          style={{
                            padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                            background: isSuspended ? '#2e7d32' : '#e65100',
                            color: '#fff',
                          }}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>

                        {/* 3. Hard Purge Delete Action */}
                        <button
                          onClick={() => handleDeleteStudent(student.uid)}
                          style={{
                            padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                            background: '#d32f2f', color: '#fff',
                          }}
                        >
                          Delete
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}