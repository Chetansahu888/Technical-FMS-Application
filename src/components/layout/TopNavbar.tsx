import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  ChevronDown,
  LogOut,
  Users,
  ShieldCheck,
  Wrench,
  User as UserIcon,
  PanelLeft,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { googleSheetsAdapter } from '../../services/googleSheetsAdapter';
import { ticketService } from '../../services/ticketService';
import { useNotification } from '../../context/NotificationContext';

interface TopNavbarProps {
  pageTitle: string;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onSyncComplete?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  pageTitle,
  onToggleSidebar,
  isSidebarCollapsed,
  onSyncComplete,
}) => {
  const notification = useNotification();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSheetConnected = googleSheetsAdapter.isConnected();
  const { currentUser, users, loginAsDemoUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="role-badge admin">
            <ShieldCheck size={12} />
            <span>Admin</span>
          </span>
        );
      case 'it_person':
        return (
          <span className="role-badge it_person">
            <Wrench size={12} />
            <span>IT Staff</span>
          </span>
        );
      default:
        return (
          <span className="role-badge employee">
            <UserIcon size={12} />
            <span>Employee</span>
          </span>
        );
    }
  };

  const handleSyncSheet = async () => {
    if (!isSheetConnected) {
      notification.info('Connect Google Sheet', 'Please configure your Google Apps Script URL in Master Settings.');
      navigate('/master-settings');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await ticketService.syncFromSheet();
      if (result.success) {
        notification.success('Sheet Synced', result.message);
        onSyncComplete?.();
      } else {
        notification.warning('Sync Notice', result.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync with Sheet';
      notification.error('Sync Error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar-toggle-btn"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={17} />
          </button>
        )}
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      <div className="topbar-right">
        {/* Google Sheet Sync Pill / Button */}
        <button
          type="button"
          onClick={handleSyncSheet}
          disabled={isSyncing}
          className={`demo-status-pill ${isSheetConnected ? 'sheet-connected' : ''}`}
          style={{
            cursor: 'pointer',
            border: isSheetConnected ? '1px solid #BBF7D0' : '1px solid var(--border)',
            background: isSheetConnected ? '#F0FDF4' : '#FEF3C7',
            color: isSheetConnected ? '#15803D' : '#92400E',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 600,
          }}
          title={isSheetConnected ? 'Click to sync changes with Google Sheet FMS' : 'Click to connect Google Sheet'}
        >
          {isSyncing ? (
            <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
          ) : isSheetConnected ? (
            <FileSpreadsheet size={13} color="#16a34a" />
          ) : (
            <Database size={13} />
          )}
          <span>
            {isSyncing ? 'Syncing...' : isSheetConnected ? 'Sheet: FMS (Sync Now)' : 'Connect Sheet'}
          </span>
        </button>

        {/* Quick Demo Role Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowProfileMenu(false);
            }}
            aria-label="Switch Demo User / Role"
          >
            <Users size={14} color="var(--primary)" />
            <span>Switch Role</span>
            <ChevronDown size={13} />
          </button>

          {showRoleMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '240px',
                zIndex: 60,
                padding: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  padding: '6px 10px',
                  textTransform: 'uppercase',
                }}
              >
                Select Demo Role
              </div>

              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    loginAsDemoUser(u.id);
                    setShowRoleMenu(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: currentUser?.id === u.id ? 'var(--primary-light)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (currentUser?.id !== u.id) {
                      e.currentTarget.style.background = '#F8FAFC';
                    }
                  }}
                  onMouseLeave={e => {
                    if (currentUser?.id !== u.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {u.name}
                    </span>
                    {getRoleBadge(u.role)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {u.company} • {u.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile & Current User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowRoleMenu(false);
            }}
            aria-label="User profile menu"
          >
            <div className="user-avatar-circle">
              {currentUser?.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ fontWeight: 600 }}>{currentUser?.name || 'User'}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                {currentUser?.company || 'Organization'}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-secondary)" />
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '200px',
                zIndex: 60,
                padding: '6px',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '4px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser?.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {currentUser?.email}
                </div>
                <div style={{ marginTop: '4px' }}>{getRoleBadge(currentUser?.role)}</div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  color: '#EF4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
