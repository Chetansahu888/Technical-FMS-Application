import React from 'react';
import { Ticket } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, DelayBadge } from '../common/Badge';
import { AttachmentViewer } from '../common/AttachmentViewer';
import { formatISTDateTime } from '../../services/dateUtils';
import {
  X,
  ExternalLink,
  User,
  Calendar,
  Building,
  Layers,
  FileSpreadsheet,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  UserCheck,
  Clock,
  Trash2,
} from 'lucide-react';

interface TicketDetailsDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onStartWork?: (ticketId: string) => void;
  onRequestHold?: (ticket: Ticket) => void;
  onResumeWork?: (ticketId: string) => void;
  onRequestMarkDone?: (ticket: Ticket) => void;
  onRequestReassign?: (ticket: Ticket) => void;
  onRequestDelete?: (ticket: Ticket) => void;
}

export const TicketDetailsDrawer: React.FC<TicketDetailsDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  onStartWork,
  onRequestHold,
  onResumeWork,
  onRequestMarkDone,
  onRequestReassign,
  onRequestDelete,
}) => {
  const { currentUser } = useAuth();

  if (!isOpen || !ticket) return null;

  const isIT = currentUser?.role === 'it_person';
  const isAdmin = currentUser?.role === 'admin';
  const isAssignedToMe = currentUser?.id === ticket.currentlyAssignedToId;
  const canPerformITActions = (isIT && isAssignedToMe) || isAdmin;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--primary)',
                letterSpacing: '-0.3px',
              }}
            >
              {ticket.ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <DelayBadge
              plannedDate={ticket.plannedDate}
              actualDate={ticket.actualDate}
              status={ticket.status}
            />
          </div>

          <button
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Top Quick Meta */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Company</span>
              <div
                className="detail-value"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Building size={14} color="var(--primary)" />
                <strong>{ticket.company}</strong>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Category</span>
              <div
                className="detail-value"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Layers size={14} color="var(--text-secondary)" />
                <span>{ticket.category}</span>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Application / System</span>
              <div
                className="detail-value"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={14} color="var(--text-secondary)" />
                <span>{ticket.applicationName}</span>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Sheet / Page Name</span>
              <div className="detail-value">{ticket.sheetOrPageName}</div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Requester</span>
              <div
                className="detail-value"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <User size={14} color="var(--text-secondary)" />
                <span>{ticket.requesterName}</span>
                {ticket.submissionType === 'On Behalf' && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}
                  >
                    (on behalf of {ticket.onBehalfOf})
                  </span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Helpdesk Ref / Ticket</span>
              <div className="detail-value">{ticket.helpTicketNumber || 'N/A'}</div>
            </div>

            {ticket.systemUrl && (
              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                <span className="detail-label">System / Page URL</span>
                <div className="detail-value">
                  <a
                    href={ticket.systemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--primary)',
                      wordBreak: 'break-all',
                    }}
                  >
                    <span>{ticket.systemUrl}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Problem & Correction Descriptions */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '6px',
              }}
            >
              Problem Description
            </div>
            <div className="description-box">{ticket.problemDescription}</div>
          </div>

          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '6px',
              }}
            >
              What Has To Be Changed
            </div>
            <div className="description-box" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
              {ticket.whatHasToBeChanged}
            </div>
          </div>

          {/* Solution Remarks if completed */}
          {ticket.status === 'Completed' && ticket.solutionRemarks && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#065F46',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle size={15} />
                <span>Solution Remarks</span>
              </div>
              <div
                className="description-box"
                style={{
                  background: '#ECFDF5',
                  borderColor: '#A7F3D0',
                  color: '#064E3B',
                  fontWeight: 500,
                }}
              >
                {ticket.solutionRemarks}
              </div>
            </div>
          )}

          {/* Hold Reason if On Hold */}
          {ticket.status === 'Hold' && ticket.holdReason && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#991B1B',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Pause size={15} />
                <span>Reason on Hold</span>
              </div>
              <div
                className="description-box"
                style={{
                  background: '#FFF1F2',
                  borderColor: '#FECDD3',
                  color: '#881337',
                  fontWeight: 500,
                }}
              >
                {ticket.holdReason}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
              }}
            >
              Attachments ({ticket.attachments.length})
            </div>
            <AttachmentViewer attachments={ticket.attachments} readOnly />
          </div>

          {/* Assignment Timestamps */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
              }}
            >
              Assignment Timelines
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Originally Assigned</span>
                <div className="detail-value">{ticket.originallyAssignedToName}</div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Currently Assigned</span>
                <div className="detail-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {ticket.currentlyAssignedToName}
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Request Timestamp (IST)</span>
                <div
                  className="detail-value"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Calendar size={13} color="var(--text-secondary)" />
                  <span>{formatISTDateTime(ticket.requestDate)}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Planned Date (IST)</span>
                <div
                  className="detail-value"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock size={13} color="var(--text-secondary)" />
                  <span>{formatISTDateTime(ticket.plannedDate)}</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Actual Resolved (IST)</span>
                <div className="detail-value">
                  {ticket.actualDate ? formatISTDateTime(ticket.actualDate) : 'Pending resolution'}
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Resolved By</span>
                <div className="detail-value">{ticket.resolvedByName || '-'}</div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '12px',
              }}
            >
              Activity Audit Trail ({ticket.activityLog?.length || 0})
            </div>
            <div className="timeline">
              {ticket.activityLog?.map(act => (
                <div key={act.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-meta">
                    <span className="timeline-actor">{act.actorName}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#F1F5F9',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {act.action}
                    </span>
                    <span>•</span>
                    <span>{formatISTDateTime(act.timestamp)}</span>
                  </div>
                  {act.remarks && <div className="timeline-remarks">{act.remarks}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with contextual action buttons */}
        <div className="drawer-footer">
          {isAdmin && ticket.status !== 'Completed' && onRequestReassign && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onRequestReassign(ticket)}
            >
              <UserCheck size={14} />
              <span>Reassign Ticket</span>
            </button>
          )}

          {canPerformITActions && (
            <>
              {ticket.status === 'Pending' && onStartWork && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onStartWork(ticket.id)}
                >
                  <Play size={14} />
                  <span>Start Work</span>
                </button>
              )}

              {ticket.status === 'In Progress' && (
                <>
                  {onRequestHold && (
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => onRequestHold(ticket)}
                    >
                      <Pause size={14} />
                      <span>Put on Hold</span>
                    </button>
                  )}
                  {onRequestMarkDone && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => onRequestMarkDone(ticket)}
                    >
                      <CheckCircle size={14} />
                      <span>Mark Done</span>
                    </button>
                  )}
                </>
              )}

              {ticket.status === 'Hold' && onResumeWork && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onResumeWork(ticket.id)}
                >
                  <RotateCcw size={14} />
                  <span>Resume Work</span>
                </button>
              )}
            </>
          )}

          {isAdmin && onRequestDelete && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ borderColor: '#FECACA', color: '#DC2626' }}
              onClick={() => onRequestDelete(ticket)}
              title="Delete this ticket permanently"
            >
              <Trash2 size={14} color="#DC2626" />
              <span>Delete Ticket</span>
            </button>
          )}

          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
