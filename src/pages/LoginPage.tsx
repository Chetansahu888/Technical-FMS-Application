import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Wrench,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Database,
  Cpu,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemoUser, users } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your work email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Invalid credentials.');
    }
  };

  const handleDemoLogin = (userId: string) => {
    loginAsDemoUser(userId);
    navigate('/dashboard');
  };

  return (
    <div className="login-page-wrapper">
      {/* Left Panel: Login Form */}
      <div className="login-left-panel">
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div className="brand-icon" style={{ width: '42px', height: '42px', padding: '3px' }}>
              <img src="/logo.png" alt="Technical Help FMS" className="brand-logo-img" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                Technical Help FMS
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Enterprise Technical Problem Tracking
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>
              Sign In to Your Account
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Enter your credentials to access tickets, assignments and reports.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '6px',
                }}
              >
                Work Email Address <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                style={{ width: '100%', padding: '9px 12px' }}
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '6px',
                }}
              >
                Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  style={{ width: '100%', padding: '9px 12px', paddingRight: '38px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Preview Demo Roles Divider */}
          <div
            style={{
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Preview Demo (Select Role)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Admin Button */}
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  textAlign: 'left',
                }}
                onClick={() => handleDemoLogin('usr_admin_1')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#7C3AED" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Suresh Verma</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      System Admin / Manager
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </button>

              {/* IT Staff: Bhupendra */}
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  textAlign: 'left',
                }}
                onClick={() => handleDemoLogin('usr_it_bhupendra')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Bhupendra</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      IT Specialist / Assignee
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </button>

              {/* IT Staff: Md Alauddin */}
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  textAlign: 'left',
                }}
                onClick={() => handleDemoLogin('usr_it_alauddin')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Md Alauddin</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      IT Specialist / Assignee
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </button>

              {/* Employee: Rahul Sharma */}
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  textAlign: 'left',
                }}
                onClick={() => handleDemoLogin('usr_emp_rahul')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="#059669" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Rahul Sharma</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Employee (PMMPL)
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Technical Support Illustration */}
      <div className="login-right-panel">
        <div className="login-illustration-container">
          {/* SVG Illustration depicting technical systems, sheets, forms, react apps and resolved tickets */}
          <svg
            viewBox="0 0 460 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 10px 20px rgba(37,99,235,0.12))' }}
          >
            {/* Background platform cards */}
            <rect x="50" y="40" width="360" height="230" rx="16" fill="#FFFFFF" stroke="#BFDBFE" strokeWidth="2" />
            
            {/* Top app bar */}
            <rect x="50" y="40" width="360" height="38" rx="16" fill="#EFF6FF" />
            <circle cx="75" cy="59" r="5" fill="#EF4444" />
            <circle cx="92" cy="59" r="5" fill="#F59E0B" />
            <circle cx="109" cy="59" r="5" fill="#10B981" />
            <rect x="140" y="52" width="180" height="14" rx="4" fill="#DBEAFE" />

            {/* Central connected grid cards */}
            {/* Card 1: Google Sheets / FMS */}
            <g transform="translate(75, 100)">
              <rect width="135" height="65" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
              <rect x="10" y="12" width="24" height="24" rx="4" fill="#D1FAE5" />
              <path d="M16 18H28M16 24H28M16 30H24" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
              <text x="42" y="24" fill="#0F172A" fontSize="11" fontWeight="700" fontFamily="sans-serif">Google Sheets</text>
              <text x="42" y="38" fill="#64748B" fontSize="9.5" fontFamily="sans-serif">FMS Tracking</text>
            </g>

            {/* Card 2: React Apps & Forms */}
            <g transform="translate(245, 100)">
              <rect width="140" height="65" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
              <rect x="10" y="12" width="24" height="24" rx="4" fill="#DBEAFE" />
              <path d="M22 17L16 24L22 31M26 17L32 24L26 31" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              <text x="42" y="24" fill="#0F172A" fontSize="11" fontWeight="700" fontFamily="sans-serif">React & Forms</text>
              <text x="42" y="38" fill="#64748B" fontSize="9.5" fontFamily="sans-serif">Portal Issues</text>
            </g>

            {/* Central Resolution Node */}
            <g transform="translate(195, 175)">
              <circle cx="35" cy="35" r="28" fill="#2563EB" />
              <path d="M26 35L32 41L45 28" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Connecting dashed lines */}
            <path d="M142 165V195H195" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M315 165V195H265" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 4" />

            {/* Bottom Status Ticker */}
            <g transform="translate(80, 240)">
              <rect width="300" height="18" rx="4" fill="#EFF6FF" />
              <circle cx="95" cy="249" r="3" fill="#10B981" />
              <text x="105" y="253" fill="#1E40AF" fontSize="9" fontWeight="600" fontFamily="sans-serif">
                SLA Engine • Auto Assignment • IST Timezone
              </text>
            </g>
          </svg>

          <h2 className="illustration-message">
            “Raise issues. Track progress. Resolve faster.”
          </h2>
          <p className="illustration-sub">
            Seamless coordination for Google Sheets, FMS trackers, web forms, and internal apps across PMMPL, RKL, Purab, Refrasynth & Refratech.
          </p>
        </div>
      </div>
    </div>
  );
};
