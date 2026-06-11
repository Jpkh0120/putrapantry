import React, { useEffect, useState } from 'react';
import api from '../../services/api'; 

export default function ManageUsers() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/all');
      setStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStatusChange = async (studentId, action) => {
    if (!window.confirm(`Are you sure you want to "${action}" this student?`)) return;

    try {
      await api.post('/api/student/update-status', { studentId, action });
      alert(`Action: ${action} applied successfully.`);
      fetchStudents(); 
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this student. Proceed?')) return;

    try {
      await api.delete(`/api/student/${studentId}`);
      alert('Student deleted successfully.');
      fetchStudents(); 
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading student profiles securely...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.87rem' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '10px 14px', fontWeight: '600', color: '#555' }}>Student Details</th>
              <th style={{ padding: '10px 14px', fontWeight: '600', color: '#555', textAlign: 'center' }}>Verification</th>
              <th style={{ padding: '10px 14px', fontWeight: '600', color: '#555', textAlign: 'center' }}>Account Status</th>
              <th style={{ padding: '10px 14px', fontWeight: '600', color: '#555', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>No students registered in the system.</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px', color: '#333' }}>
                    <strong>{student.name || 'No Name Provided'}</strong>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{student.email}</div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {student.isVerified ? (
                      <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Verified</span>
                    ) : (
                      <span style={{ background: '#fff3e0', color: '#e65100', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {student.status === 'suspended' ? (
                      <span style={{ background: '#fce4ec', color: '#c62828', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Suspended</span>
                    ) : (
                      <span style={{ background: '#e8eaf6', color: '#3949ab', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Active</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {!student.isVerified && (
                        <button onClick={() => handleStatusChange(student.id, 'verify')} style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Verify</button>
                      )}
                      {student.status !== 'suspended' ? (
                        <button onClick={() => handleStatusChange(student.id, 'suspend')} style={{ background: '#fff3e0', color: '#e65100', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Suspend</button>
                      ) : (
                        <button onClick={() => handleStatusChange(student.id, 'unsuspend')} style={{ background: '#e8eaf6', color: '#3949ab', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Activate</button>
                      )}
                      <button onClick={() => handleDelete(student.id)} style={{ background: '#fce4ec', color: '#c62828', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}