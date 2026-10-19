import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { StatusBadge, DelayBadge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { formatISTDateTime, getTicketDelayInfo } from '../services/dateUtils';
import { Download, Filter, BarChart2, Eye, Calendar, RefreshCw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { openTicketDetails } = useOutletContext<AppLayoutContextType>();

  // Filter states
  const [dateBasis, setDateBasis] = useState<'requestDate' | 'plannedDate' | 'actualDate'>('requestDate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [company, setCompany] = useState('All');
  const [itPersonId, setItPersonId] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const companies = masterDataService.getCompanies();
  const categories = masterDataService.getCategories();
  const itPersons = masterDataService.getUsers().filter(u => u.role === 'it_person');
  const allTickets = ticketService.getTickets();

  // All matching records according to active filters
  const filteredRecords = useMemo(() => {
    return ticketService.filterTickets(allTickets, {
      dateBasis,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      company,
      itPersonId,
      category,
      status,
    });
  }, [allTickets, dateBasis, startDate, endDate, company, itPersonId, category, status]);

  // Current page records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Export CSV handler
  const handleExportCSV = () => {
    const csvContent = ticketService.generateCSV(filteredRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Technical_Help_FMS_Report_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setDateBasis('requestDate');
    setStartDate('');
    setEndDate('');
    setCompany('All');
    setItPersonId('All');
    setCategory('All');
    setStatus('All');
    setCurrentPage(1);
  };

  // High-level MIS metrics calculation
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    let completedOnTime = 0;
    let completedDelayed = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let holdCount = 0;

    filteredRecords.forEach(t => {
      if (t.status === 'Completed') {
        const info = getTicketDelayInfo(t.plannedDate, t.actualDate);
        if (info.isOverdue) completedDelayed++;
        else completedOnTime++;
      } else if (t.status === 'Pending') pendingCount++;
      else if (t.status === 'In Progress') inProgressCount++;
      else if (t.status === 'Hold') holdCount++;
    });

    const completedTotal = completedOnTime + completedDelayed;
    const onTimeRate = completedTotal > 0 ? Math.round((completedOnTime / completedTotal) * 100) : 100;

    return {
      total,
      completedTotal,
      completedOnTime,
      completedDelayed,
      onTimeRate,
      openTickets: pendingCount + inProgressCount + holdCount,
    };
  }, [filteredRecords]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>MIS & Operational Reports</h1>
          <p>
            Multi-dimensional audit reports with date-basis filtering and complete CSV data export for corporate analytics.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            title="Export all matching filtered records to CSV"
          >
            <Download size={15} />
            <span>Export CSV ({filteredRecords.length} records)</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="stat-cards-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span>Filtered Total</span>
            <BarChart2 size={16} color="var(--primary)" />
          </div>
          <div className="stat-card-value">{metrics.total}</div>
          <div className="stat-card-sub">Matching criteria</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Resolved</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
              {metrics.completedTotal} Tickets
            </span>
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {metrics.completedTotal}
          </div>
          <div className="stat-card-sub">{metrics.onTimeRate}% on-time SLA</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Completed On Time</span>
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {metrics.completedOnTime}
          </div>
          <div className="stat-card-sub">Met business day SLA</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span style={{ color: '#DC2626' }}>Completed Delayed</span>
          </div>
          <div className="stat-card-value" style={{ color: '#DC2626' }}>
            {metrics.completedDelayed}
          </div>
          <div className="stat-card-sub">Breached SLA before done</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Currently Active / Open</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
            {metrics.openTickets}
          </div>
          <div className="stat-card-sub">Pending / In Progress / Hold</div>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
            <Filter size={16} color="var(--primary)" />
            <span>Filter Criteria</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleResetFilters}
          >
            <RefreshCw size={12} />
            <span>Reset All</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Date Basis */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>Date Basis:</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={dateBasis}
              onChange={e => {
                setDateBasis(e.target.value as 'requestDate' | 'plannedDate' | 'actualDate');
                setCurrentPage(1);
              }}
            >
              <option value="requestDate">Request Date</option>
              <option value="plannedDate">Planned SLA Date</option>
              <option value="actualDate">Actual Resolved Date</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>From Date:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '100%' }}
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>To Date:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '100%' }}
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Company */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>Company:</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={company}
              onChange={e => {
                setCompany(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* IT Person */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>Assigned IT Person:</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={itPersonId}
              onChange={e => {
                setItPersonId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All IT Specialists</option>
              {itPersons.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>Category:</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>Status:</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
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
        </div>
      </div>

      {/* Reports Table with all requested columns */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Request Timestamp</th>
              <th>Company</th>
              <th>Requester</th>
              <th>Category</th>
              <th>Application</th>
              <th>Originally Assigned</th>
              <th>Currently Assigned</th>
              <th>Resolved By</th>
              <th>Planned (IST)</th>
              <th>Actual (IST)</th>
              <th>Delay / Remaining</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>View</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No matching report records found.
                </td>
              </tr>
            ) : (
              paginatedRecords.map(t => (
                <tr key={t.id}>
                  <td>
                    <span
                      className="ticket-num-link"
                      onClick={() => openTicketDetails(t)}
                    >
                      {t.ticketNumber}
                    </span>
                  </td>
                  <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {formatISTDateTime(t.requestDate)}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{t.company}</span>
                  </td>
                  <td>{t.requesterName}</td>
                  <td>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{t.category}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.applicationName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.sheetOrPageName}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{t.originallyAssignedToName}</td>
                  <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                    {t.currentlyAssignedToName}
                  </td>
                  <td style={{ fontSize: '12px', color: '#065F46' }}>
                    {t.resolvedByName || '-'}
                  </td>
                  <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    {formatISTDateTime(t.plannedDate)}
                  </td>
                  <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {t.actualDate ? formatISTDateTime(t.actualDate) : '-'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <DelayBadge
                      plannedDate={t.plannedDate}
                      actualDate={t.actualDate}
                      status={t.status}
                    />
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openTicketDetails(t)}
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredRecords.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRecords.length}
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
