import React, { useState, useMemo } from 'react';
import { masterDataService } from '../services/masterDataService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Wrench,
  User as UserIcon,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Building,
  RotateCcw,
  Plus,
  Cloud,
  ExternalLink,
  Copy,
  Check,
  Code2,
  FileSpreadsheet,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';
import { googleSheetsAdapter } from '../services/googleSheetsAdapter';
import { ticketService } from '../services/ticketService';

export const MasterSettingsPage: React.FC = () => {
  const notification = useNotification();
  const { refreshUsers, currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>(() => masterDataService.getUsers());
  const companies = masterDataService.getCompanies();

  // Google Drive & Sheet integration state
  const initialSettings = masterDataService.getSettings();
  const [driveFolderId, setDriveFolderId] = useState(initialSettings.googleDriveFolderId || '1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5');
  const [appsScriptUrl, setAppsScriptUrl] = useState(initialSettings.googleAppsScriptUrl || '');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [isPullingAll, setIsPullingAll] = useState(false);

  // Form states for creating a new user or admin
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState(companies[0] || 'PMMPL');
  const [role, setRole] = useState<'admin' | 'it_person' | 'employee'>('employee');

  // Filter & Search states for the user table
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'it_person' | 'employee'>('all');

  // Company management state
  const [newCompany, setNewCompany] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notification.warning('Validation Error', 'Please enter user full name.');
      return;
    }
    if (!password.trim()) {
      notification.warning('Validation Error', 'Please enter a password for this user account.');
      return;
    }

    // Auto-generate clean unique email for system compatibility
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
    const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    let emailCandidate = `${cleanName}@${cleanCompany}.com`;
    let counter = 1;
    while (users.some(u => u.email.toLowerCase() === emailCandidate.toLowerCase())) {
      emailCandidate = `${cleanName}${counter}@${cleanCompany}.com`;
      counter++;
    }

    const created = masterDataService.addUser({
      name: name.trim(),
      email: emailCandidate,
      password: password.trim(),
      company,
      role,
    });

    const updatedUsers = masterDataService.getUsers();
    setUsers(updatedUsers);
    refreshUsers();

    setName('');
    setPassword('');
    setRole('employee');
    notification.success(
      'User Created Successfully',
      `Added ${created.name} as ${created.role === 'admin' ? 'System Admin' : created.role === 'it_person' ? 'IT Specialist' : 'Employee'}.`
    );
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

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    masterDataService.addCompany(newCompany.trim());
    setNewCompany('');
    notification.success('Company Added', `Added ${newCompany.trim()} to company master.`);
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
          u.email.toLowerCase().includes(q) ||
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
            Create new user accounts, assign Administrator privileges, IT Specialists, and manage company staff access.
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

      {/* CREATE NEW USER OR ADMIN FORM */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <UserPlus size={17} color="var(--primary)" />
          <span>Add New User / Admin Account</span>
        </div>

        <form onSubmit={handleAddUser}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* User Full Name */}
            <div>
              <label
                htmlFor="user-fullname"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="user-fullname"
                type="text"
                className="form-control"
                style={{ width: '100%' }}
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="user-password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="user-password"
                type="text"
                className="form-control"
                style={{ width: '100%' }}
                placeholder="Set account password (e.g. 123456)"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {/* Company */}
            <div>
              <label
                htmlFor="user-company"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Company <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="user-company"
                className="form-select"
                style={{ width: '100%' }}
                value={company}
                onChange={e => setCompany(e.target.value)}
              >
                {companies.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Role / Admin Option */}
            <div>
              <label
                htmlFor="user-role"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Role & Permissions <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="user-role"
                className="form-select"
                style={{ width: '100%', fontWeight: 600 }}
                value={role}
                onChange={e => setRole(e.target.value as 'admin' | 'it_person' | 'employee')}
              >
                <option value="admin">⭐ Admin (Full System & User Control)</option>
                <option value="it_person">🔧 IT Specialist (Resolves Tickets)</option>
                <option value="employee">👤 Employee (Raises & Views Tickets)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '160px' }}>
              <UserPlus size={15} />
              <span>{role === 'admin' ? 'Create Admin Account' : 'Add User Account'}</span>
            </button>
          </div>
        </form>
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
              placeholder="Search user by name, email, or company..."
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

      {/* QUICK COMPANY TAGS */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">
          <Building size={16} color="var(--primary)" />
          <span>Active Companies</span>
        </div>

        <form onSubmit={handleAddCompany} style={{ display: 'flex', gap: '8px', marginBottom: '14px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: 1 }}
            placeholder="Add new company..."
            value={newCompany}
            onChange={e => setNewCompany(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Add</span>
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {companies.map(c => (
            <span
              key={c}
              style={{
                padding: '4px 10px',
                background: '#F1F5F9',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* GOOGLE SHEET & DRIVE UNIFIED INTEGRATION */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} color="#16a34a" />
            <span>Google Sheet (FMS) &amp; Drive Integration</span>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              background: appsScriptUrl ? '#DCFCE7' : '#FEF3C7',
              color: appsScriptUrl ? '#15803D' : '#B45309',
            }}
          >
            {appsScriptUrl ? '● Live Bi-directional Sync Connected' : '○ Ready to Connect (Paste Web App URL)'}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          React app aur aapke Google Sheet (tab <strong>FMS</strong>) ke bich dynamic 2-way sync. React me kiya gaya koi bhi badlav sheet me automatic save hoga, aur sheet se kiye gaye badlav React me sync honge.
        </p>

        {/* Feature Highlights Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            background: '#F8FAFC',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: '#166534' }}>✓ Dynamic Header Reading:</span>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Row 6 (ya kisi bhi row) ke header names automatically match hote hain.
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#1E40AF' }}>✓ Formula Protection:</span>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              <strong>Planned</strong> aur <strong>Delay</strong> columns ko code kabhi overwrite nahi karega.
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#7C3AED' }}>✓ Actual Timestamp IST:</span>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Complete hone par date <strong>MM/DD/YYYY HH:MM:SS</strong> format me save hoti hai.
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#0369A1' }}>✓ Google Drive Storage:</span>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Sabhi Images/PDFs folder <code>1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5</code> me save hongi.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Target Folder ID */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Target Google Drive Folder ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
                value={driveFolderId}
                onChange={e => setDriveFolderId(e.target.value)}
                placeholder="1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5"
              />
              <a
                href={`https://drive.google.com/drive/u/0/folders/${driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                title="Open Folder in Google Drive"
              >
                <span>Open Drive</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Apps Script Web App URL */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Google Apps Script Web App URL (Unified for Sheet &amp; Drive)
            </label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%', fontSize: '12px' }}
              value={appsScriptUrl}
              onChange={e => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowScriptModal(!showScriptModal)}
            >
              <Code2 size={14} />
              <span>{showScriptModal ? 'Hide Code' : 'View & Copy Complete Apps Script Code'}</span>
            </button>

            {appsScriptUrl && (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={isPullingAll}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={async () => {
                    setIsPullingAll(true);
                    try {
                      const res = await ticketService.syncFromSheet();
                      if (res.success) {
                        notification.success('Sheet Synced', res.message);
                      } else {
                        notification.warning('Notice', res.message);
                      }
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Pull error';
                      notification.error('Error', msg);
                    } finally {
                      setIsPullingAll(false);
                    }
                  }}
                >
                  <RefreshCw size={13} style={isPullingAll ? { animation: 'spin 1s linear infinite' } : {}} />
                  <span>{isPullingAll ? 'Pulling...' : 'Pull From Sheet (FMS)'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={isPushingAll}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={async () => {
                    setIsPushingAll(true);
                    try {
                      const all = ticketService.getTickets();
                      const res = await googleSheetsAdapter.syncAllTicketsToSheet(all);
                      if (res.success) {
                        notification.success('Bulk Push Complete', res.message);
                      } else {
                        notification.warning('Notice', res.message);
                      }
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Push error';
                      notification.error('Error', msg);
                    } finally {
                      setIsPushingAll(false);
                    }
                  }}
                >
                  <UploadCloud size={13} />
                  <span>{isPushingAll ? 'Pushing...' : 'Push All Tickets To Sheet'}</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              masterDataService.updateDriveSettings(driveFolderId, appsScriptUrl);
              notification.success('Settings Saved', 'Google Sheet and Drive settings updated successfully.');
            }}
          >
            Save Integration Settings
          </button>
        </div>

        {/* Expandable Apps Script Code & Guide */}
        {showScriptModal && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              background: '#F8FAFC',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Unified Google Apps Script (Sheet FMS + Drive Uploads) - Sirf 1 Bar Deploy Karein
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                onClick={() => {
                  navigator.clipboard.writeText(googleSheetsAdapter.getCompleteAppsScriptCode(driveFolderId));
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                  notification.info('Copied', 'Apps Script code copied to clipboard!');
                }}
              >
                {copiedCode ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: '1.7', marginBottom: '12px' }}>
              <li>
                Apne Google Sheet (jisme <strong>FMS</strong> tab hai) me upar menu se <strong>Extensions &gt; Apps Script</strong> open karein.
              </li>
              <li>
                Purana code delete karke niche diya gaya poora code paste karein aur Save (Ctrl+S) karein.
              </li>
              <li>
                Top-right me <strong>Deploy &gt; New deployment</strong> click karein.
              </li>
              <li>
                Gear icon se <strong>Web app</strong> choose karein:
                <br />
                - <em>Execute as:</em> <strong>Me</strong>
                <br />
                - <em>Who has access:</em> <strong>Anyone</strong>
              </li>
              <li>
                Deploy click karke mila hua <strong>Web app URL (/exec)</strong> upar box me paste karein aur <strong>Save Integration Settings</strong> daba dein!
              </li>
            </ol>

            <pre
              style={{
                background: '#1E293B',
                color: '#F8FAFC',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                overflowX: 'auto',
                maxHeight: '260px',
                fontFamily: 'monospace',
              }}
            >
              {googleSheetsAdapter.getCompleteAppsScriptCode(driveFolderId)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
