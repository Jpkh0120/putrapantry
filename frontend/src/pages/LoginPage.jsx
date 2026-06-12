import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  // Recovery state
  const [showRecovery, setShowRecovery]       = useState(false);
  const [recoveryEmail, setRecoveryEmail]     = useState('');
  const [recoveryStatus, setRecoveryStatus]   = useState(''); // 'success' | 'error' | ''
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

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

      if (code.includes('user-disabled')) {
        message = '❌ Access Denied: This student user account has been suspended by an administrator.';
      } else if (code.includes('user-not-found') || code.includes('invalid-credential')) {
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

  async function handlePasswordReset(e) {
    e.preventDefault();

    if (!recoveryEmail.trim()) {
      setRecoveryStatus('error');
      setRecoveryMessage('Please enter your email address.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryStatus('');
    setRecoveryMessage('');

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, recoveryEmail.trim());
      setRecoveryStatus('success');
      setRecoveryMessage('Reset link sent! Check your inbox (and spam folder).');
    } catch (err) {
      const code = err.code || '';
      let message = 'Failed to send reset email. Please try again.';

      if (code.includes('user-not-found') || code.includes('invalid-credential')) {
        // Don't reveal whether the account exists — generic message for security
        message = 'If that email is registered, a reset link has been sent.';
        setRecoveryStatus('success'); // Treat as success to avoid account enumeration
      } else if (code.includes('invalid-email')) {
        message = 'Please enter a valid email address.';
        setRecoveryStatus('error');
      } else if (code.includes('too-many-requests')) {
        message = 'Too many requests. Please wait a moment and try again.';
        setRecoveryStatus('error');
      } else {
        setRecoveryStatus('error');
      }

      setRecoveryMessage(message);
    } finally {
      setRecoveryLoading(false);
    }
  }

  function toggleRecovery() {
    setShowRecovery(prev => !prev);
    setRecoveryEmail('');
    setRecoveryStatus('');
    setRecoveryMessage('');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🥗 PutraPantry</h1>
          <p>Sign in to access your student pantry dashboard</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

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
            <div className="label-row">
              <label>Password</label>
              <button
                type="button"
                className="forgot-link"
                onClick={toggleRecovery}
              >
                {showRecovery ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Password Recovery Panel */}
        {showRecovery && (
          <div className="recovery-panel">
            <p className="recovery-desc">
              Enter your registered email and we'll send you a reset link.
            </p>

            {recoveryMessage && (
              <div className={`alert ${recoveryStatus === 'success' ? 'alert-success' : 'alert-error'}`}>
                {recoveryMessage}
              </div>
            )}

            {recoveryStatus !== 'success' && (
              <form className="recovery-form" onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label>Registered Email</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="e.g. name@student.upm.edu.my"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="submit-btn submit-btn--secondary"
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="auth-footer">
          <p>Don't have an account yet? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  );
}