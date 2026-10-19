import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import { masterDataService } from '../services/masterDataService';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { Pagination } from '../components/common/Pagination';
import { DelayBadge } from '../components/common/Badge';
import { formatISTDateTime } from '../services/dateUtils';
import { Search, CheckCircle2, Eye, Paperclip, History } from 'lucide-react';

export const CompletedTicketsPage: React.FC = () => {
  const { openTicketDetails, tick } = useOutletContext<AppLayoutContextType>();

  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const companies = masterDataService.getCompanies();
  const allTickets = useMemo(() => ticketService.getTickets(), [tick]);

  const completedTickets = useMemo(() => {
    return allTickets.filter(t => t.status === 'Completed');
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    return ticketService.filterTickets(completedTickets, {
      search,
      company,
    });
  }, [completedTickets, search, company]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Completed Tickets Archive</h1>
          <p>
            Historical record of resolved technical issues, solution remarks, resolver audit and SLA delay performance.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search completed tickets by ticket, solution remarks, app, requester..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
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

        {(search || company !== 'All') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setCompany('All');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Dedicated Completed Tickets Table */}
      {filteredTickets.length === 0 ? (
        <div
          className="table-container"
          style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          <CheckCircle2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>No completed tickets found</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap', minWidth: '90px' }}>Ticket</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Request & Resolved (IST)</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '85px' }}>Company</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Application & Requester</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '140px' }}>Assigned & Resolver</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Planned SLA</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Actual Resolved</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '140px' }}>Delay Performance</th>
                <th style={{ minWidth: '220px', maxWidth: '320px' }}>Solution Remarks</th>
                <th style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>Files & History</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map(t => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span
                      className="ticket-num-link"
                      onClick={() => openTicketDetails(t)}
                      style={{ whiteSpace: 'nowrap', display: 'inline-block' }}
                    >
                      {t.ticketNumber}
                    </span>
                  </td>

                  <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <div>Req: {formatISTDateTime(t.requestDate)}</div>
                    <div style={{ color: '#065F46', fontWeight: 600 }}>
                      Res: {t.actualDate ? formatISTDateTime(t.actualDate) : '-'}
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        background: '#F1F5F9',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      {t.company}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600 }}>{t.applicationName}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      By {t.requesterName}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned:</span>{' '}
                      <strong>{t.currentlyAssignedToName}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#065F46' }}>
                      <span>Resolved by:</span> <strong>{t.resolvedByName || t.currentlyAssignedToName}</strong>
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {formatISTDateTime(t.plannedDate)}
                  </td>

                  <td style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, color: '#065F46' }}>
                    {t.actualDate ? formatISTDateTime(t.actualDate) : '-'}
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <DelayBadge
                      plannedDate={t.plannedDate}
                      actualDate={t.actualDate}
                      status={t.status}
                    />
                  </td>

                  <td style={{ minWidth: '220px', maxWidth: '320px' }}>
                    <div
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        fontSize: '12px',
                        color: '#064E3B',
                        background: '#ECFDF5',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #A7F3D0',
                      }}
                      title={t.solutionRemarks}
                    >
                      {t.solutionRemarks || 'No remarks'}
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t.attachments.length > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Paperclip size={13} color="var(--primary)" />
                          <span>{t.attachments.length}</span>
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <History size={13} color="var(--text-muted)" />
                        <span>{t.activityLog.length}</span>
                      </span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openTicketDetails(t)}
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
