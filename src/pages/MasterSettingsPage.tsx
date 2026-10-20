import React, { useState, useMemo, useEffect } from 'react';
import { masterDataService } from '../services/masterDataService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import {
  Users,
  ShieldCheck,
  Wrench,
  User as UserIcon,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  Check,
  RefreshCw,
  Edit2,
  X,
} from 'lucide-react';

export const MasterSettingsPage: React.FC = () => {
  const notification = useNotification();
  const { refreshUsers, currentUser, updateUser } = useAuth();

  const [users, setUsers] = useState<User[]>(() => masterDataService.getUsers());
  const companies = masterDataService.getCompanies();

  // Listen to header 'Sync Now' event
  useEffect(() => {
    const handleSync = () => {
      setUsers(masterDataService.getUsers());
    };
    window.addEventListener('tech_fms_synced', handleSync);
    return () => window.removeEventListener('tech_fms_synced', handleSync);
  }, []);

  // Filter & Search states for the user table
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'it_person' | 'employee'>('all');

  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'it_person' | 'employee'>('employee');

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditCompany(user.company);
    setEditPassword(user.password || '');
    setEditRole(user.role);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      notification.warning('Validation Error', 'Please enter a valid user name.');
      return;
    }

    if (editingUser.role === 'admin' && editRole !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        notification.error('Action Denied', 'At least one System Admin must exist in the system.');
        return;
      }
    }

    updateUser(editingUser.id, {
      name: editName.trim(),
      company: editCompany.trim() || 'PMMPL',
      password: editPassword.trim() || undefined,
      role: editRole,
    });

    const updated = masterDataService.getUsers();
    setUsers(updated);
    refreshUsers();
    setEditingUser(null);
    notification.success('User Details Updated', `Successfully updated "${editName.trim()}".`);
  };



  const handleRoleChange = (id: string, newRole: 'admin' | 'it_person' | 'employee') => {
    const userToChange = users.find(u => u.id === id);
    if (!userToChange) return;

    // Prevent demoting the only admin
    if (userToChange.role === 'admin' && newRole !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        notification.error('Action Denied', 'At least one System Admin must exist in the system.');
        return;
      }
    }

    const updated = masterDataService.updateUser(id, { role: newRole });
    setUsers(updated);
    refreshUsers();
    notification.success('Role Updated', `${userToChange.name} is now ${newRole === 'admin' ? 'an Admin' : newRole === 'it_person' ? 'an IT Specialist' : 'an Employee'}.`);
  };

  const handleToggleActive = (id: string) => {
    const userToToggle = users.find(u => u.id === id);
    if (!userToToggle) return;

    if (userToToggle.id === currentUser?.id) {
      notification.warning('Warning', 'You cannot deactivate your own logged-in account.');
      return;
    }

    const updated = masterDataService.toggleUserActive(id);
    setUsers(updated);
    refreshUsers();
    notification.info('Status Changed', `User status updated for ${userToToggle.name}.`);
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;

    if (userToDelete.id === currentUser?.id) {
      notification.error('Cannot Delete', 'You cannot delete your own account.');
      return;
    }

    if (userToDelete.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        notification.error('Action Denied', 'Cannot delete the only remaining System Admin.');
        return;
      }
    }

    if (confirm(`Are you sure you want to delete user "${userToDelete.name}"?`)) {
      const updated = masterDataService.deleteUser(id);
      setUsers(updated);
      refreshUsers();
      notification.success('User Deleted', `User ${userToDelete.name} has been removed.`);
    }
  };

  const handleResetUsers = () => {
    if (confirm('Are you sure you want to reset all users to default factory list?')) {
      masterDataService.resetToDefaults();
      setUsers(masterDataService.getUsers());
      refreshUsers();
      notification.success('Users Reset', 'User list reset to default.');
    }
  };

  // Filtered users for directory
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          u.name.toLowerCase().includes(q) ||
          u.company.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [users, roleFilter, search]);

  const adminCount = users.filter(u => u.role === 'admin').length;
  const itCount = users.filter(u => u.role === 'it_person').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>User & Admin Management</h1>
          <p>
            Directory of registered users, administrator privileges, IT specialists, and company access.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleResetUsers}
            title="Reset users to initial factory accounts"
          >
            <RotateCcw size={14} />
            <span>Reset Default Users</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="stat-cards-grid" style={{ marginBottom: '20px' }}>
        <div
          className={`stat-card ${roleFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setRoleFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-header">
            <span>Total Registered Users</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-sub">Active staff across all entities</div>
        </div>

        <div
          className={`stat-card ${roleFilter === 'admin' ? 'active-filter' : ''}`}
          onClick={() => setRoleFilter('admin')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-header">
            <span>System Admins</span>
            <ShieldCheck size={16} color="#7C3AED" />
          </div>
          <div className="stat-card-value" style={{ color: '#7C3AED' }}>
            {adminCount}
          </div>
          <div className="stat-card-sub">Full access & user management</div>
        </div>

        <div
          className={`stat-card ${roleFilter === 'it_person' ? 'active-filter' : ''}`}
          onClick={() => setRoleFilter('it_person')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-header">
            <span>IT Specialists</span>
            <Wrench size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
            {itCount}
          </div>
          <div className="stat-card-sub">Assigned ticket resolvers</div>
        </div>

        <div
          className={`stat-card ${roleFilter === 'employee' ? 'active-filter' : ''}`}
          onClick={() => setRoleFilter('employee')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-header">
            <span>Employees</span>
            <UserIcon size={16} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {employeeCount}
          </div>
          <div className="stat-card-sub">Ticket requesters</div>
        </div>
      </div>



      {/* USER DIRECTORY & MANAGEMENT TABLE */}
      <div className="card">
        <div
          className="card-title"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--primary)" />
            <span>User Directory ({filteredUsers.length})</span>
          </div>

          {/* Quick Role Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRoleFilter('all')}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRoleFilter('admin')}
            >
              Admins ({adminCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'it_person' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRoleFilter('it_person')}
            >
              IT Specialists ({itCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'employee' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRoleFilter('employee')}
            >
              Employees ({employeeCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search user by name or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="table-container" style={{ marginBottom: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Password</th>
                <th>Company</th>
                <th>Current Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions & Role Control</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const isCurrent = user.id === currentUser?.id;

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background:
                              user.role === 'admin'
                                ? '#EDE9FE'
                                : user.role === 'it_person'
                                ? '#DBEAFE'
                                : '#F1F5F9',
                            color:
                              user.role === 'admin'
                                ? '#6D28D9'
                                : user.role === 'it_person'
                                ? '#1E40AF'
                                : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          {isCurrent && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '10.5px',
                                background: '#D1FAE5',
                                color: '#065F46',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          background: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#334155',
                          fontWeight: 600,
                          letterSpacing: '0.5px',
                        }}
                      >
                        {user.password || '123456'}
                      </span>
                    </td>

                    <td>
                      <span className="badge-company">{user.company}</span>
                    </td>

                    <td>
                      {user.role === 'admin' && (
                        <span className="role-badge admin">
                          <ShieldCheck size={12} />
                          <span>Admin</span>
                        </span>
                      )}
                      {user.role === 'it_person' && (
                        <span className="role-badge it_person">
                          <Wrench size={12} />
                          <span>IT Specialist</span>
                        </span>
                      )}
                      {user.role === 'employee' && (
                        <span className="role-badge employee">
                          <UserIcon size={12} />
                          <span>Employee</span>
                        </span>
                      )}
                    </td>

                    <td>
                      {user.active ? (
                        <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} color="#059669" /> Active
                        </span>
                      ) : (
                        <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={13} color="#DC2626" /> Inactive
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* Edit User/Admin Button */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--primary)',
                            borderColor: 'var(--primary-light)',
                          }}
                          onClick={() => handleStartEdit(user)}
                          title="Edit user/admin name & details"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        {/* Change Role Selector */}
                        <select
                          className="form-select"
                          style={{ fontSize: '11.5px', padding: '3px 6px', height: '28px' }}
                          value={user.role}
                          onChange={e =>
                            handleRoleChange(
                              user.id,
                              e.target.value as 'admin' | 'it_person' | 'employee'
                            )
                          }
                          title="Change user access level"
                        >
                          <option value="admin">Admin</option>
                          <option value="it_person">IT Specialist</option>
                          <option value="employee">Employee</option>
                        </select>

                        {/* Toggle Active/Inactive */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                          onClick={() => handleToggleActive(user.id)}
                          disabled={isCurrent}
                          title={user.active ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Delete User */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 6px', color: '#EF4444', borderColor: '#FECACA' }}
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isCurrent}
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT USER / ADMIN MODAL */}
      {editingUser && (
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
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
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
                    Edit User / Admin
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Update display name, credentials, and access role
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleSaveEditUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter user full name"
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
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
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
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block' }}>
                    Role / Permissions
                  </label>
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as 'admin' | 'it_person' | 'employee')}
                  >
                    <option value="admin">System Admin (Full Access)</option>
                    <option value="it_person">IT Specialist (Resolve & Assign)</option>
                    <option value="employee">Employee (Submit & Track)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
