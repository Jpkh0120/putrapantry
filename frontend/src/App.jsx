// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';




function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f3f4f6',
      gap: '12px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #d1d5db',
        borderTop: '4px solid #16a34a',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading PutraPantry...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProtectedRoute({ children, allowedRole }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRole && userRole !== allowedRole) return <Navigate to="/login" replace />;

  return children;
}

function RoleRedirect() {
  const { currentUser, userRole, loading } = useAuth();

  // Still resolving Firebase session
  if (loading) return <LoadingScreen />;

  // Not logged in
  if (!currentUser) return <Navigate to="/login" replace />;

  // Logged in but role not fetched from backend yet — wait instead of bouncing to /login
  if (!userRole) return <LoadingScreen />;

  if (userRole === 'admin')   return <Navigate to="/admin"   replace />;
  if (userRole === 'student') return <Navigate to="/student" replace />;

  // Logged in but unknown role
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}