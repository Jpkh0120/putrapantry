// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // Prevents browser page refresh — no need to swap <form> for <div>

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login attempt failure details:', err);

      const code = err.code || err.message || '';
      let message = 'Invalid email or password.';

      if (code.includes('user-not-found') || code.includes('invalid-credential')) {
        message = 'No account found with this email or password combination.';
      } else if (code.includes('wrong-password')) {
        message = 'Incorrect password. Please try again.';
      } else if (code.includes('invalid-email')) {
        message = 'Please enter a valid email address format.';
      } else if (code.includes('too-many-requests')) {
        message = 'Too many failed login attempts. Account temporarily locked.';
      } else {
        message = err.response?.data?.message || err.message || message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🥗 PutraPantry</h1>
          <p>Sign in to access your student pantry dashboard</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Proper <form> with onSubmit — handles both button click AND Enter key natively */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. name@student.upm.edu.my"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {/* type="submit" triggers onSubmit — no onClick needed */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account yet? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  );
}