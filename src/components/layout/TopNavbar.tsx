import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  ShieldCheck,
  Wrench,
  User as UserIcon,
  PanelLeft,
  RefreshCw,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { googleSheetsAdapter } from '../../services/googleSheetsAdapter';
import { ticketService } from '../../services/ticketService';
import { masterDataService } from '../../services/masterDataService';
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
  const { currentUser, logout, updateUser, refreshUsers } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Edit own profile modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const companies = masterDataService.getCompanies();

  const handleOpenEditProfile = () => {
    setShowProfileMenu(false);
    setProfileName(currentUser?.name || '');
    setProfileCompany(currentUser?.company || companies[0] || 'PMMPL');
    setProfilePassword(currentUser?.password || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileName.trim()) {
      notification.warning('Validation Error', 'Please enter your name.');
      return;
    }
    updateUser(currentUser.id, {
      name: profileName.trim(),
      company: profileCompany.trim(),
      password: profilePassword.trim() || undefined,
    });
    setShowEditProfileModal(false);
    notification.success('Profile Updated', `Your name has been updated to "${profileName.trim()}".`);
  };

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

  const handleSyncAll = async () => {
    if (!isSheetConnected) {
      notification.warning('Google Sheet Not Connected', 'Please verify Google Apps Script URL configuration.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Sync FMS Tickets
      const ticketResult = await ticketService.syncFromSheet();

      // 2. Sync Master Sheet Users
      let userCount = 0;
      const userRes = await googleSheetsAdapter.fetchUsersFromSheet();
      if (userRes.success && userRes.users && userRes.users.length > 0) {
        masterDataService.syncUsersFromSheet(userRes.users);
        refreshUsers();
        userCount = userRes.users.length;
      }

      notification.success(
        'Google Sheet Synced',
        `FMS tickets synced (${ticketResult.count || 0}) and Master users synced (${userCount || 0}).`
      );

      // Trigger re-render across listening pages
      window.dispatchEvent(new CustomEvent('tech_fms_synced'));
      onSyncComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync with Google Sheet';
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
        {/* Unified Sync Now Button */}
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="btn btn-primary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
          title="Sync all tickets and master users from Google Sheet"
        >
          <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {/* Profile & Current User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
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
                  {currentUser?.company || 'Organization'}
                </div>
                <div style={{ marginTop: '4px' }}>{getRoleBadge(currentUser?.role)}</div>
              </div>

              {/* Edit Profile / Name Option */}
              <button
                type="button"
                onClick={handleOpenEditProfile}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  marginBottom: '2px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Edit2 size={14} color="var(--primary)" />
                <span>Edit Profile / Name</span>
              </button>

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

      {/* EDIT CURRENT USER PROFILE MODAL */}
      {showEditProfileModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              padding: '24px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Edit My Profile
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Update your display name and profile details
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>
                    Company / Organization
                  </label>
                  <select
                    className="form-select"
                    value={profileCompany}
                    onChange={e => setProfileCompany(e.target.value)}
                  >
                    {companies.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>
                    Password
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profilePassword}
                    onChange={e => setProfilePassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
