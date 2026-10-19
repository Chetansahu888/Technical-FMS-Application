import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { TicketTable } from '../components/tickets/TicketTable';
import { Pagination } from '../components/common/Pagination';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { Search, PlusCircle, Filter } from 'lucide-react';

export const AllTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openTicketDetails, requestHold, requestComplete, requestReassign, requestDelete, tick } =
    useOutletContext<AppLayoutContextType>();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [company, setCompany] = useState('All');
  const [category, setCategory] = useState('All');
  const [itPersonId, setItPersonId] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const companies = masterDataService.getCompanies();
  const categories = masterDataService.getCategories();
  const itPersons = masterDataService.getUsers().filter(u => u.role === 'it_person');
  const allTickets = useMemo(() => ticketService.getTickets(), [tick]);

  const filteredTickets = useMemo(() => {
    return ticketService.filterTickets(allTickets, {
      search,
      status,
      company,
      category,
      itPersonId,
    });
  }, [allTickets, search, status, company, category, itPersonId]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>All System Tickets</h1>
          <p>
            Complete registry of all technical help requests. Manage assignments, reassign tickets with reason tracking, and inspect activity logs.
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

      {/* Comprehensive Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search all tickets by ticket, requester, app, problem..."
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

        <div className="filter-group">
          <label className="filter-label">Assignee:</label>
          <select
            className="form-select"
            value={itPersonId}
            onChange={e => {
              setItPersonId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All IT Specialists</option>
            {itPersons.map(it => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Category:</label>
          <select
            className="form-select"
            value={category}
            onChange={e => {
              setCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {(search || status !== 'All' || company !== 'All' || category !== 'All' || itPersonId !== 'All') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setStatus('All');
              setCompany('All');
              setCategory('All');
              setItPersonId('All');
              setCurrentPage(1);
            }}
          >
            Reset Filters
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
