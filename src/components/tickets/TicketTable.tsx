import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, DelayBadge } from '../common/Badge';
import { formatISTDateTime } from '../../services/dateUtils';
import {
  Eye,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  UserCheck,
  Inbox,
  ChevronDown,
  Trash2,
} from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onStartWork?: (ticketId: string) => void;
  onRequestHold?: (ticket: Ticket) => void;
  onResumeWork?: (ticketId: string) => void;
  onRequestMarkDone?: (ticket: Ticket) => void;
  onRequestReassign?: (ticket: Ticket) => void;
  onRequestDelete?: (ticket: Ticket) => void;
  showAssigneeColumn?: boolean;
}

export const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  onSelectTicket,
  onStartWork,
  onRequestHold,
  onResumeWork,
  onRequestMarkDone,
  onRequestReassign,
  onRequestDelete,
  showAssigneeColumn = true,
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isIT = currentUser?.role === 'it_person';

  // Active floating menu positioned outside table overflow
  const [activeMenu, setActiveMenu] = useState<{
    ticket: Ticket;
    rect: DOMRect;
  } | null>(null);

  // Close floating portal menu on scroll, resize, or escape key
  useEffect(() => {
    if (!activeMenu) return;
    const handleScrollOrResize = () => setActiveMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  if (tickets.length === 0) {
    return (
      <div
        className="table-container"
        style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <Inbox size={42} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
          No tickets found
        </div>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>
          No records match the current filters or no tickets have been raised yet.
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ whiteSpace: 'nowrap', minWidth: '75px' }}>Ticket</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Request Date (IST)</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '70px' }}>Company</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '110px' }}>Requester</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Application & Page</th>
            <th style={{ minWidth: '160px', maxWidth: '240px' }}>Problem Summary</th>
            {showAssigneeColumn && (
              <th style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>Assigned To</th>
            )}
            <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Planned SLA</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '85px' }}>Status</th>
            <th style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>Overdue / Remaining</th>
            <th style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '75px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => {
            const isMenuOpen = activeMenu?.ticket.id === ticket.id;

            return (
              <tr key={ticket.id}>
                {/* Ticket Number */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span
                    className="ticket-num-link"
                    onClick={() => onSelectTicket(ticket)}
                    title="Click to view full ticket details"
                    style={{ whiteSpace: 'nowrap', display: 'inline-block' }}
                  >
                    {ticket.ticketNumber}
                  </span>
                </td>

                {/* Request Date */}
                <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {formatISTDateTime(ticket.requestDate)}
                </td>

                {/* Company */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      background: '#F1F5F9',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    {ticket.company}
                  </span>
                </td>

                {/* Requester */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{ticket.requesterName}</div>
                  {ticket.submissionType === 'On Behalf' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      for {ticket.onBehalfOf}
                    </div>
                  )}
                </td>

                {/* Application & Page */}
                <td style={{ minWidth: '130px', maxWidth: '180px' }}>
                  <div
                    style={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={ticket.applicationName}
                  >
                    {ticket.applicationName}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={ticket.sheetOrPageName}
                  >
                    {ticket.sheetOrPageName}
                  </div>
                </td>

                {/* Problem Summary (2-line wrap) */}
                <td style={{ minWidth: '160px', maxWidth: '240px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                    }}
                    title={ticket.problemDescription}
                  >
                    {ticket.problemDescription}
                  </div>
                </td>

                {/* Assigned To */}
                {showAssigneeColumn && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {ticket.currentlyAssignedToName}
                    </span>
                  </td>
                )}

                {/* Planned Date */}
                <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                  {formatISTDateTime(ticket.plannedDate)}
                </td>

                {/* Status */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <StatusBadge status={ticket.status} />
                </td>

                {/* Overdue / Remaining */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <DelayBadge
                    plannedDate={ticket.plannedDate}
                    actualDate={ticket.actualDate}
                    status={ticket.status}
                  />
                </td>

                {/* Compact Action Button */}
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm action-btn"
                    onClick={e => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (activeMenu?.ticket.id === ticket.id) {
                        setActiveMenu(null);
                      } else {
                        setActiveMenu({ ticket, rect });
                      }
                    }}
                    title="Click to view actions for this ticket"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontWeight: 600,
                      fontSize: '11.5px',
                      background: isMenuOpen ? 'var(--primary-light)' : '#ffffff',
                      borderColor: isMenuOpen ? 'var(--primary)' : 'var(--border)',
                      color: isMenuOpen ? 'var(--primary)' : 'var(--text-main)',
                    }}
                  >
                    <span>Action</span>
                    <ChevronDown
                      size={12}
                      style={{
                        transition: 'transform 0.15s',
                        transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Portal Dropdown Menu: Renders to body to NEVER be clipped by table container */}
      {activeMenu &&
        createPortal(
          <>
            {/* Transparent backdrop to close when clicking outside */}
            <div
              className="action-portal-backdrop"
              onClick={() => setActiveMenu(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99998,
                background: 'transparent',
              }}
            />

            {/* Menu Panel */}
            <div
              className="action-dropdown-menu action-portal-popup"
              style={{
                position: 'fixed',
                top: (() => {
                  const estimatedHeight = 220;
                  const spaceBelow = window.innerHeight - activeMenu.rect.bottom;
                  if (spaceBelow < estimatedHeight && activeMenu.rect.top > estimatedHeight) {
                    return activeMenu.rect.top - estimatedHeight - 4;
                  }
                  return activeMenu.rect.bottom + 4;
                })(),
                left: Math.max(10, Math.min(window.innerWidth - 220, activeMenu.rect.right - 210)),
                zIndex: 99999,
                minWidth: '210px',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow:
                  '0 12px 32px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)',
                padding: '6px',
                textAlign: 'left',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '6px 10px 4px',
                  borderBottom: '1px solid #F1F5F9',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    fontWeight: 700,
                  }}
                >
                  {activeMenu.ticket.ticketNumber} Actions
                </div>
              </div>

              {/* View Full Details */}
              <button
                type="button"
                className="action-dropdown-item"
                onClick={() => {
                  const t = activeMenu.ticket;
                  setActiveMenu(null);
                  onSelectTicket(t);
                }}
              >
                <Eye size={14} color="#3B82F6" />
                <span>View Full Details</span>
              </button>

              {/* Start Work */}
              {((isIT && currentUser?.id === activeMenu.ticket.currentlyAssignedToId) || isAdmin) &&
                activeMenu.ticket.status === 'Pending' &&
                onStartWork && (
                  <button
                    type="button"
                    className="action-dropdown-item highlight-blue"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onStartWork(t.id);
                    }}
                  >
                    <Play size={14} color="#2563EB" />
                    <span style={{ fontWeight: 600, color: '#2563EB' }}>
                      Start Work
                    </span>
                  </button>
                )}

              {/* Put on Hold */}
              {((isIT && currentUser?.id === activeMenu.ticket.currentlyAssignedToId) || isAdmin) &&
                activeMenu.ticket.status === 'In Progress' &&
                onRequestHold && (
                  <button
                    type="button"
                    className="action-dropdown-item highlight-yellow"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onRequestHold(t);
                    }}
                  >
                    <Pause size={14} color="#D97706" />
                    <span style={{ fontWeight: 600, color: '#D97706' }}>
                      Put on Hold
                    </span>
                  </button>
                )}

              {/* Resume Work */}
              {((isIT && currentUser?.id === activeMenu.ticket.currentlyAssignedToId) || isAdmin) &&
                activeMenu.ticket.status === 'Hold' &&
                onResumeWork && (
                  <button
                    type="button"
                    className="action-dropdown-item highlight-blue"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onResumeWork(t.id);
                    }}
                  >
                    <RotateCcw size={14} color="#2563EB" />
                    <span style={{ fontWeight: 600, color: '#2563EB' }}>
                      Resume Work
                    </span>
                  </button>
                )}

              {/* Mark Done (Submit Solution) */}
              {((isIT && currentUser?.id === activeMenu.ticket.currentlyAssignedToId) || isAdmin) &&
                activeMenu.ticket.status === 'In Progress' &&
                onRequestMarkDone && (
                  <button
                    type="button"
                    className="action-dropdown-item highlight-green"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onRequestMarkDone(t);
                    }}
                  >
                    <CheckCircle size={14} color="#059669" />
                    <span style={{ fontWeight: 600, color: '#059669' }}>
                      Mark Done / Submit
                    </span>
                  </button>
                )}

              {/* Reassign (Admin) */}
              {isAdmin &&
                activeMenu.ticket.status !== 'Completed' &&
                onRequestReassign && (
                  <button
                    type="button"
                    className="action-dropdown-item highlight-purple"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onRequestReassign(t);
                    }}
                  >
                    <UserCheck size={14} color="#7C3AED" />
                    <span style={{ fontWeight: 500, color: '#6D28D9' }}>
                      Reassign Ticket
                    </span>
                  </button>
                )}

              {/* Delete Ticket (Admin) */}
              {isAdmin && onRequestDelete && (
                <>
                  <div
                    style={{
                      height: '1px',
                      background: '#F1F5F9',
                      margin: '4px 0',
                    }}
                  />
                  <button
                    type="button"
                    className="action-dropdown-item highlight-red"
                    onClick={() => {
                      const t = activeMenu.ticket;
                      setActiveMenu(null);
                      onRequestDelete(t);
                    }}
                  >
                    <Trash2 size={14} color="#EF4444" />
                    <span style={{ fontWeight: 600, color: '#EF4444' }}>
                      Delete Ticket
                    </span>
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
