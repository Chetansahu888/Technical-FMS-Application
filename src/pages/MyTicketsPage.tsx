import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { TicketTable } from '../components/tickets/TicketTable';
import { Pagination } from '../components/common/Pagination';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { Search, PlusCircle, Filter } from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { openTicketDetails, requestHold, requestComplete, requestReassign, requestDelete, tick } =
    useOutletContext<AppLayoutContextType>();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [company, setCompany] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const companies = masterDataService.getCompanies();
  const allTickets = useMemo(() => ticketService.getTickets(), [tick]);

  // Filter only tickets raised by current user
  const myTickets = useMemo(() => {
    return allTickets.filter(t => t.requesterId === currentUser?.id);
  }, [allTickets, currentUser]);

  const filteredTickets = useMemo(() => {
    return ticketService.filterTickets(myTickets, {
      search,
      status,
      company,
    });
  }, [myTickets, search, status, company]);

  // Pagination slice
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>My Submitted Tickets</h1>
          <p>Track the live status, planned timeline, assigned IT specialists, and technical fixes for issues you raised.</p>
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

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by ticket, application, problem..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

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
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
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

        {(search || status !== 'All' || company !== 'All') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setStatus('All');
              setCompany('All');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tickets Table */}
      <TicketTable
        tickets={paginatedTickets}
        onSelectTicket={openTicketDetails}
        onRequestHold={requestHold}
        onRequestMarkDone={requestComplete}
        onRequestReassign={requestReassign}
        onRequestDelete={requestDelete}
        showAssigneeColumn={true}
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
