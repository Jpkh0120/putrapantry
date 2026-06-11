// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css'; // Reusing your beautiful auth styles!

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.role);
      navigate('/');
    } catch (err) {
      // Extract the error indicator string from Firebase code or raw message string
      let friendlyMessage = 'Registration failed. Please try again.';
      const errorCode = err.code || err.message || '';

      if (errorCode.includes('email-already-in-use')) {
        friendlyMessage = 'This email address is already registered. Try logging in instead.';
      } else if (errorCode.includes('weak-password')) {
        friendlyMessage = 'Your password is too weak. It must be at least 6 characters long.';
      } else if (errorCode.includes('invalid-email')) {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (errorCode.includes('network-request-failed')) {
        friendlyMessage = 'Network error. Please check your internet connection.';
      } else {
        // Fallback to Express backend or database error message if available
        friendlyMessage = err.response?.data?.message || err.message || friendlyMessage;
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Branding Header */}
        <div className="auth-header">
          <h1>🥗 PutraPantry</h1>
          <p>Create an account to join the food share community</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name Field */}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. POH KOK HAO"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. name@student.upm.edu.my"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Role Dropdown Selector */}
          <div className="form-group">
            <label>Account Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In here</Link></p>
        </div>
      </div>
    </div>
  );
}