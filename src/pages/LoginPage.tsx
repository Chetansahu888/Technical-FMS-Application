import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import './LoginPage.css';

const REMEMBER_KEY = 'tech_fms_remembered_username';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_KEY));
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter your username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // Handle Remember Me persistence securely (username only)
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, cleanUsername);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      // storage unavailable
    }

    setLoading(true);
    const result = await login(cleanUsername, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Invalid username or password.');
    }
  };

  return (
    <div className="login-root">
      {/* -----------------------------------------------------------------
          1. Left Branding Panel (Dark Navy with Ambient Glow)
          ----------------------------------------------------------------- */}
      <div className="login-brand-panel">
        {/* Ambient Glow Orbs */}
        <div className="brand-glow-orb brand-glow-1" aria-hidden="true" />
        <div className="brand-glow-orb brand-glow-2" aria-hidden="true" />
        <div className="brand-glow-orb brand-glow-3" aria-hidden="true" />
        <div className="brand-grid-overlay" aria-hidden="true" />

        <div className="brand-content">
          {/* Top Brand Header */}
          <div className="brand-header-badge">
            <div className="brand-logo-badge">
              <img src="/logo.png" alt="Technical Help" className="brand-logo-img" />
            </div>
            <div className="brand-title-wrap">
              <span className="brand-name-text">Technical Help</span>
              <span className="brand-tagline-text">Faster Support | Better Solutions</span>
            </div>
          </div>

          {/* Center Hero Information */}
          <div className="brand-hero">
            <div className="brand-hero-pill">
              <ShieldCheck size={13} />
              <span>Enterprise IT Support</span>
            </div>

            <h1 className="brand-hero-heading">
              Reliable Support for Your <span>Technical Needs</span>
            </h1>

            <p className="brand-hero-desc">
              Solve problems. Get support. Stay productive.
            </p>

            {/* Three Feature Highlights */}
            <div className="brand-features-grid">
              <div className="brand-feature-card">
                <div className="brand-feature-icon">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="brand-feature-title">Faster Resolution</div>
                  <div className="brand-feature-sub">Prioritized assignment and swift turnaround for technical issues</div>
                </div>
              </div>

              <div className="brand-feature-card">
                <div className="brand-feature-icon">
                  <Users size={18} />
                </div>
                <div>
                  <div className="brand-feature-title">Better Collaboration</div>
                  <div className="brand-feature-sub">Seamless live coordination between company staff and IT specialists</div>
                </div>
              </div>

              <div className="brand-feature-card">
                <div className="brand-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="brand-feature-title">Reliable Support</div>
                  <div className="brand-feature-sub">Transparent tracking, audit trail, and verified issue solutions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Brand Footer */}
          <div className="brand-footer">
            <span>Technical Help FMS Portal</span>
            <span>Secure Enterprise Environment</span>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          2. Right Login Form Panel (Centered Clean White Card)
          ----------------------------------------------------------------- */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Compact brand header for mobile view */}
          <div className="login-card-brand">
            <div className="brand-logo-badge" style={{ width: '38px', height: '38px' }}>
              <img src="/logo.png" alt="Technical Help" className="brand-logo-img" />
            </div>
            <div className="brand-title-wrap">
              <span className="brand-name-text" style={{ color: '#0F172A', fontSize: '17px' }}>
                Technical Help
              </span>
              <span className="brand-tagline-text" style={{ color: '#2563EB' }}>
                Faster Support | Better Solutions
              </span>
            </div>
          </div>

          <div className="login-card-header">
            <h2 className="login-card-title">Welcome Back!</h2>
            <p className="login-card-subtitle">Sign in to continue to your account.</p>
          </div>

          {/* Inline Validation / Error Message */}
          {errorMessage && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Username Field */}
            <div className="login-field">
              <label htmlFor="login-username" className="login-label">
                User Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="login-input-wrap">
                <div className="login-input-icon">
                  <UserIcon size={17} />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  className="login-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="login-input-wrap">
                <div className="login-input-icon">
                  <Lock size={17} />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingRight: '44px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="login-options-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  className="remember-checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Login →</span>
              )}
            </button>
          </form>

          {/* Subtle Security Indicator */}
          <div className="login-security-indicator">
            <span className="security-dot" aria-hidden="true" />
            <ShieldCheck size={14} color="#2563EB" />
            <span>Secure Access • Enterprise Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
