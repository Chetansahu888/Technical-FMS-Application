import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { TicketTable } from '../components/tickets/TicketTable';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { getTicketDelayInfo } from '../services/dateUtils';
import {
  Layers,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ExternalLink,
  PlusCircle,
  Users,
  User,
  ShieldCheck,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isIT = currentUser?.role === 'it_person';

  const { openTicketDetails, requestHold, requestComplete, requestReassign, requestDelete, tick } =
    useOutletContext<AppLayoutContextType>();
  const navigate = useNavigate();

  const [companyFilter, setCompanyFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const companies = masterDataService.getCompanies();
  const allTickets = useMemo(() => ticketService.getTickets(), [tick]);

  // Role-based scoping: Admin sees all tickets; Non-admin sees only their own tickets
  const baseScopedTickets = useMemo(() => {
    if (isAdmin) {
      return allTickets; // Only admin ko sab show ho
    }
    if (isIT) {
      // IT Specialist sees tickets assigned to them or raised by them
      return allTickets.filter(
        t => t.currentlyAssignedToId === currentUser?.id || t.requesterId === currentUser?.id
      );
    }
    // Employee sees only their own raised tickets
    return allTickets.filter(
      t =>
        t.requesterId === currentUser?.id ||
        (currentUser?.email && t.requesterEmail?.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [allTickets, isAdmin, isIT, currentUser]);

  // List of unique users/requesters for Admin filter & summary table
  const userWiseBreakdown = useMemo(() => {
    if (!isAdmin) return [];

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        company: string;
        total: number;
        pending: number;
        inProgress: number;
        hold: number;
        completed: number;
        overdue: number;
      }
    >();

    allTickets.forEach(t => {
      const key = t.requesterId || t.requesterEmail || t.requesterName;
      if (!map.has(key)) {
        map.set(key, {
          id: t.requesterId || key,
          name: t.requesterName,
          email: t.requesterEmail || '-',
          company: t.company,
          total: 0,
          pending: 0,
          inProgress: 0,
          hold: 0,
          completed: 0,
          overdue: 0,
        });
      }
      const item = map.get(key)!;
      item.total++;
      if (t.status === 'Pending') item.pending++;
      else if (t.status === 'In Progress') item.inProgress++;
      else if (t.status === 'Hold') item.hold++;
      else if (t.status === 'Completed') item.completed++;

      const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
      if (delay.isOverdue && t.status !== 'Completed') {
        item.overdue++;
      }
    });

    return Array.from(map.values());
  }, [allTickets, isAdmin]);

  // Filtered tickets based on active filters
  const filteredTickets = useMemo(() => {
    let tickets = baseScopedTickets;

    // Company filter
    if (companyFilter !== 'All') {
      tickets = tickets.filter(t => t.company === companyFilter);
    }

    // User filter (for Admin)
    if (isAdmin && userFilter !== 'All') {
      tickets = tickets.filter(
        t =>
          t.requesterId === userFilter ||
          t.requesterName === userFilter ||
          t.requesterEmail === userFilter
      );
    }

    // Date range filter
    if (startDate) {
      const s = new Date(startDate).getTime();
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() <= e.getTime());
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Overdue') {
        tickets = tickets.filter(t => {
          const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
          return delay.isOverdue && t.status !== 'Completed';
        });
      } else {
        tickets = tickets.filter(t => t.status === statusFilter);
      }
    }

    return tickets;
  }, [baseScopedTickets, companyFilter, userFilter, startDate, endDate, statusFilter, isAdmin]);

  // Stats calculation based on scoped & company/user/date filtered context
  const stats = useMemo(() => {
    let tickets = baseScopedTickets;

    if (companyFilter !== 'All') {
      tickets = tickets.filter(t => t.company === companyFilter);
    }
    if (isAdmin && userFilter !== 'All') {
      tickets = tickets.filter(
        t =>
          t.requesterId === userFilter ||
          t.requesterName === userFilter ||
          t.requesterEmail === userFilter
      );
    }
    if (startDate) {
      const s = new Date(startDate).getTime();
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() <= e.getTime());
    }

    let pending = 0;
    let inProgress = 0;
    let hold = 0;
    let completed = 0;
    let overdue = 0;

    tickets.forEach(t => {
      if (t.status === 'Pending') pending++;
      else if (t.status === 'In Progress') inProgress++;
      else if (t.status === 'Hold') hold++;
      else if (t.status === 'Completed') completed++;

      const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
      if (delay.isOverdue && t.status !== 'Completed') overdue++;
    });

    return {
      total: tickets.length,
      pending,
      inProgress,
      hold,
      completed,
      overdue,
    };
  }, [baseScopedTickets, companyFilter, userFilter, startDate, endDate, isAdmin]);

  // Overdue tickets in scoped view
  const overdueTickets = useMemo(() => {
    return filteredTickets.filter(t => {
      const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
      return delay.isOverdue && t.status !== 'Completed';
    });
  }, [filteredTickets]);

  const handleCardClick = (status: string) => {
    setStatusFilter(prev => (prev === status ? 'All' : status));
  };

  return (
    <div>
      {/* Page Title & Top Actions */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>
              {isAdmin
                ? 'Dashboard & Operational Overview'
                : `My Dashboard (${currentUser?.name})`}
            </h1>
            {isAdmin && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={13} />
                Admin Full Access
              </span>
            )}
          </div>
          <p>
            {isAdmin
              ? 'Complete cross-company overview, user-wise performance metrics and live ticket status.'
              : `Welcome, ${currentUser?.name}! Here are real-time details and resolution progress of your tickets.`}
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/new-ticket')}
          >
            <PlusCircle size={15} />
            <span>Raise New Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} color="var(--primary)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter View:</span>
        </div>

        {/* Company Filter */}
        <div className="filter-group">
          <label className="filter-label">Company:</label>
          <select
            className="form-select"
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
          >
            <option value="All">All Companies</option>
            {companies.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* User Filter (Only Admin sees all users) */}
        {isAdmin && (
          <div className="filter-group">
            <label className="filter-label">User / Requester:</label>
            <select
              className="form-select"
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
            >
              <option value="All">All Users</option>
              {userWiseBreakdown.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name} ({u.company})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">From:</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">To:</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        {(companyFilter !== 'All' ||
          userFilter !== 'All' ||
          startDate ||
          endDate ||
          statusFilter !== 'All') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setCompanyFilter('All');
              setUserFilter('All');
              setStartDate('');
              setEndDate('');
              setStatusFilter('All');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Active User Filter Badge if Admin filtered by user */}
      {isAdmin && userFilter !== 'All' && (
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary-light)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--primary)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <User size={15} />
          <span>
            Viewing tickets raised by: <strong>{userFilter}</strong>
          </span>
          <button
            type="button"
            onClick={() => setUserFilter('All')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <X size={14} /> Clear User Filter
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="stat-cards-grid">
        {/* Total */}
        <div
          className={`stat-card ${statusFilter === 'All' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('All')}
          title="Click to view all tickets in this view"
        >
          <div className="stat-card-header">
            <span>{isAdmin ? 'Total Tickets' : 'My Total Tickets'}</span>
            <Layers size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-sub reconcile-note">
            Reconciles: {stats.pending + stats.inProgress + stats.hold + stats.completed}
          </div>
        </div>

        {/* Pending */}
        <div
          className={`stat-card ${statusFilter === 'Pending' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('Pending')}
          title="Click to filter by Pending"
        >
          <div className="stat-card-header">
            <span>Pending</span>
            <Clock size={16} color="#D97706" />
          </div>
          <div className="stat-card-value" style={{ color: '#D97706' }}>
            {stats.pending}
          </div>
          <div className="stat-card-sub">Awaiting IT pickup</div>
        </div>

        {/* In Progress */}
        <div
          className={`stat-card ${statusFilter === 'In Progress' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('In Progress')}
          title="Click to filter by In Progress"
        >
          <div className="stat-card-header">
            <span>In Progress</span>
            <PlayCircle size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
            {stats.inProgress}
          </div>
          <div className="stat-card-sub">Under active solution</div>
        </div>

        {/* Hold */}
        <div
          className={`stat-card ${statusFilter === 'Hold' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('Hold')}
          title="Click to filter by Hold"
        >
          <div className="stat-card-header">
            <span>On Hold</span>
            <PauseCircle size={16} color="#DC2626" />
          </div>
          <div className="stat-card-value" style={{ color: '#DC2626' }}>
            {stats.hold}
          </div>
          <div className="stat-card-sub">Blocked / waiting info</div>
        </div>

        {/* Overdue Flag */}
        <div
          className={`stat-card ${statusFilter === 'Overdue' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('Overdue')}
          style={{ borderColor: stats.overdue > 0 ? '#FECDD3' : 'var(--border)' }}
          title="Overdue flag: Tickets past SLA planned date"
        >
          <div className="stat-card-header">
            <span style={{ color: '#BE123C', fontWeight: 600 }}>Overdue (Flag)</span>
            <AlertTriangle size={16} color="#BE123C" />
          </div>
          <div className="stat-card-value" style={{ color: '#BE123C' }}>
            {stats.overdue}
          </div>
          <div className="stat-card-sub" style={{ color: '#BE123C' }}>
            SLA breached
          </div>
        </div>

        {/* Completed */}
        <div
          className={`stat-card ${statusFilter === 'Completed' ? 'active-filter' : ''}`}
          onClick={() => handleCardClick('Completed')}
          title="Click to filter by Completed"
        >
          <div className="stat-card-header">
            <span>Completed</span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {stats.completed}
          </div>
          <div className="stat-card-sub">Resolved with remarks</div>
        </div>
      </div>

      {/* USER-WISE DETAILS SECTION (ONLY ADMIN KO SAB SHOW HO) */}
      {isAdmin && (
        <div className="card">
          <div
            className="card-title"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--primary)" />
              <span>User-wise Ticket Summary (Admin Only)</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total Requesters: {userWiseBreakdown.length}
            </span>
          </div>

          <div className="table-container" style={{ marginBottom: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User / Requester</th>
                  <th>Company</th>
                  <th>Total Raised</th>
                  <th>Pending</th>
                  <th>In Progress</th>
                  <th>On Hold</th>
                  <th>Completed</th>
                  <th>Overdue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {userWiseBreakdown.map(userItem => (
                  <tr
                    key={userItem.id}
                    style={{
                      background:
                        userFilter === userItem.name ? 'var(--primary-light)' : 'transparent',
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '11px',
                            color: '#334155',
                          }}
                        >
                          {userItem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{userItem.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-company">{userItem.company}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{userItem.total}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: userItem.pending > 0 ? '#D97706' : 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {userItem.pending}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: userItem.inProgress > 0 ? 'var(--primary)' : 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {userItem.inProgress}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: userItem.hold > 0 ? '#DC2626' : 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {userItem.hold}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        {userItem.completed}
                      </span>
                    </td>
                    <td>
                      {userItem.overdue > 0 ? (
                        <span className="overdue-tag">{userItem.overdue} Overdue</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        onClick={() =>
                          setUserFilter(prev => (prev === userItem.name ? 'All' : userItem.name))
                        }
                      >
                        {userFilter === userItem.name ? 'Clear' : 'View Tickets'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Urgent Alert List (if any exist in current view) */}
      {overdueTickets.length > 0 && (
        <div className="card" style={{ borderColor: '#FECDD3', background: '#FFF5F5' }}>
          <div
            className="card-title"
            style={{ color: '#BE123C', display: 'flex', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={17} color="#BE123C" />
              <span>Urgent Attention Required: Overdue Tickets ({overdueTickets.length})</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>
              Planned SLA has elapsed without completion
            </span>
          </div>

          <TicketTable
            tickets={overdueTickets}
            onSelectTicket={openTicketDetails}
            onRequestHold={requestHold}
            onRequestMarkDone={requestComplete}
            onRequestReassign={requestReassign}
            onRequestDelete={requestDelete}
          />
        </div>
      )}

      {/* Main Filtered Tickets List */}
      <div className="card">
        <div
          className="card-title"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {isAdmin
                ? `Filtered Ticket List (${filteredTickets.length})`
                : `My Tickets List (${filteredTickets.length})`}
            </span>
            {statusFilter !== 'All' && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Status: {statusFilter}
              </span>
            )}
            {isAdmin && userFilter !== 'All' && (
              <span
                style={{
                  fontSize: '11px',
                  background: '#E0E7FF',
                  color: '#4338CA',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                User: {userFilter}
              </span>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/all-tickets')}
            >
              <span>View All Tickets Page</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>

        <TicketTable
          tickets={filteredTickets}
          onSelectTicket={openTicketDetails}
          onRequestHold={requestHold}
          onRequestMarkDone={requestComplete}
          onRequestReassign={requestReassign}
          onRequestDelete={requestDelete}
        />
      </div>
    </div>
  );
};
