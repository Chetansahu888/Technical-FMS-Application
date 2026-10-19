import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { TicketTable } from '../components/tickets/TicketTable';
import { Pagination } from '../components/common/Pagination';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { getTicketDelayInfo } from '../services/dateUtils';
import {
  Search,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export const AssignedTicketsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { openTicketDetails, requestHold, requestComplete, requestReassign, requestDelete, tick } =
    useOutletContext<AppLayoutContextType>();

  const itPersons = masterDataService.getUsers().filter(u => u.role === 'it_person');
  const isAdmin = currentUser?.role === 'admin';

  // For Admin: default to 'All' or specific IT specialist; for IT specialist: default to their own ID
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(
    isAdmin ? 'All' : currentUser?.id || 'All'
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [company, setCompany] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const companies = masterDataService.getCompanies();
  const allTickets = useMemo(() => ticketService.getTickets(), [tick]);

  // Tickets matching the selected assignee (or all assigned tickets if admin selects All)
  const baseAssignedTickets = useMemo(() => {
    if (selectedAssigneeId === 'All') {
      return allTickets.filter(t => t.currentlyAssignedToId);
    }
    return allTickets.filter(t => t.currentlyAssignedToId === selectedAssigneeId);
  }, [allTickets, selectedAssigneeId]);

  // Workbench Quick Stats
  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let hold = 0;
    let completed = 0;
    let overdue = 0;

    baseAssignedTickets.forEach(t => {
      if (t.status === 'Pending') pending++;
      else if (t.status === 'In Progress') inProgress++;
      else if (t.status === 'Hold') hold++;
      else if (t.status === 'Completed') completed++;

      const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
      if (delay.isOverdue && t.status !== 'Completed') {
        overdue++;
      }
    });

    return {
      total: baseAssignedTickets.length,
      pending,
      inProgress,
      hold,
      completed,
      overdue,
    };
  }, [baseAssignedTickets]);

  const filteredTickets = useMemo(() => {
    return ticketService.filterTickets(baseAssignedTickets, {
      search,
      status,
      company,
    });
  }, [baseAssignedTickets, search, status, company]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>Assigned Tickets Workbench</h1>
          <p>
            IT Resolution Workspace — View technical tickets assigned for troubleshooting, initiate work, record hold reasons, or complete with solution remarks.
          </p>
        </div>
      </div>

      {/* Workbench KPI Stat Cards */}
      <div className="stat-cards-grid" style={{ marginBottom: '20px' }}>
        <div
          className={`stat-card ${status === 'All' ? 'active-filter' : ''}`}
          onClick={() => setStatus('All')}
          style={{ cursor: 'pointer' }}
          title="Click to view all assigned tickets"
        >
          <div className="stat-card-header">
            <span>Total Assigned</span>
            <Layers size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-sub">In technician queue</div>
        </div>

        <div
          className={`stat-card ${status === 'Pending' ? 'active-filter' : ''}`}
          onClick={() => setStatus('Pending')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Pending"
        >
          <div className="stat-card-header">
            <span>Pending</span>
            <Clock size={16} color="#D97706" />
          </div>
          <div className="stat-card-value" style={{ color: '#D97706' }}>
            {stats.pending}
          </div>
          <div className="stat-card-sub">Awaiting pickup</div>
        </div>

        <div
          className={`stat-card ${status === 'In Progress' ? 'active-filter' : ''}`}
          onClick={() => setStatus('In Progress')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by In Progress"
        >
          <div className="stat-card-header">
            <span>In Progress</span>
            <PlayCircle size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
            {stats.inProgress}
          </div>
          <div className="stat-card-sub">Actively working</div>
        </div>

        <div
          className={`stat-card ${status === 'Hold' ? 'active-filter' : ''}`}
          onClick={() => setStatus('Hold')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by On Hold"
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

        <div
          className={`stat-card ${status === 'Overdue' ? 'active-filter' : ''}`}
          onClick={() => setStatus('Overdue')}
          style={{
            cursor: 'pointer',
            borderColor: stats.overdue > 0 ? '#FECDD3' : 'var(--border)',
          }}
          title="Click to filter by Overdue SLA"
        >
          <div className="stat-card-header">
            <span style={{ color: '#BE123C', fontWeight: 600 }}>Overdue</span>
            <AlertTriangle size={16} color="#BE123C" />
          </div>
          <div className="stat-card-value" style={{ color: '#BE123C' }}>
            {stats.overdue}
          </div>
          <div className="stat-card-sub" style={{ color: '#BE123C' }}>
            Past SLA deadline
          </div>
        </div>

        <div
          className={`stat-card ${status === 'Completed' ? 'active-filter' : ''}`}
          onClick={() => setStatus('Completed')}
          style={{ cursor: 'pointer' }}
          title="Click to filter by Completed"
        >
          <div className="stat-card-header">
            <span>Completed</span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {stats.completed}
          </div>
          <div className="stat-card-sub">Resolved tickets</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search tickets by ticket, app name, problem description..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Assignee Filter (Allows Admin to supervise any specialist's workbench) */}
        {isAdmin && (
          <div className="filter-group">
            <label className="filter-label">Assignee:</label>
            <select
              className="form-select"
              value={selectedAssigneeId}
              onChange={e => {
                setSelectedAssigneeId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All IT Specialists</option>
              {itPersons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <select
            className="form-select"
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending (Not Started)</option>
            <option value="In Progress">In Progress</option>
            <option value="Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue SLA</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Company:</label>
          <select
            className="form-select"
            value={company}
            onChange={e => {
              setCompany(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Companies</option>
            {companies.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {(search || status !== 'All' || company !== 'All' || (isAdmin && selectedAssigneeId !== 'All')) && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setStatus('All');
              setCompany('All');
              if (isAdmin) setSelectedAssigneeId('All');
              setCurrentPage(1);
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Assigned Tickets Table */}
      <TicketTable
        tickets={paginatedTickets}
        onSelectTicket={openTicketDetails}
        onRequestHold={requestHold}
        onRequestMarkDone={requestComplete}
        onRequestReassign={requestReassign}
        onRequestDelete={requestDelete}
        showAssigneeColumn={isAdmin && selectedAssigneeId === 'All'}
      />

      {/* Pagination */}
      {filteredTickets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTickets.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
};
