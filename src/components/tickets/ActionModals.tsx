import React, { useState } from 'react';
import { Ticket, User } from '../../types';
import { X, PauseCircle, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { masterDataService } from '../../services/masterDataService';

interface HoldModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const HoldModal: React.FC<HoldModalProps> = ({ ticket, isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory reason for putting this ticket on hold.');
      return;
    }
    onSubmit(reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PauseCircle size={18} color="#D97706" />
            <span>Put Ticket On Hold - {ticket.ticketNumber}</span>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Holding a ticket pauses active work until dependencies, credentials, or user inputs are received.
              <strong> Note: Planned SLA date will not be automatically extended.</strong>
            </p>

            <label
              htmlFor="hold-reason-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Reason for Hold <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              id="hold-reason-input"
              rows={4}
              className="form-control"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="e.g., Awaiting corporate network firewall approval for SMTP relay..."
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#EF4444',
                  fontSize: '12px',
                  marginTop: '6px',
                }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-warning">
              Confirm Hold
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CompleteModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (solutionRemarks: string) => void;
}

export const CompleteModal: React.FC<CompleteModalProps> = ({ ticket, isOpen, onClose, onSubmit }) => {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [confirmPrompt, setConfirmPrompt] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError('Please provide mandatory solution remarks explaining how the problem was resolved.');
      return;
    }
    if (!confirmPrompt) {
      setConfirmPrompt(true);
      return;
    }
    onSubmit(remarks.trim());
    setRemarks('');
    setError('');
    setConfirmPrompt(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>Mark Ticket Done - {ticket.ticketNumber}</span>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!confirmPrompt ? (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Please describe the technical solution implemented, formula updates, or changes made.
                </p>

                <label
                  htmlFor="solution-remarks-input"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Solution Remarks <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  id="solution-remarks-input"
                  rows={4}
                  className="form-control"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="e.g. Corrected Google Apps Script trigger onEdit() parameter and tested row update with user..."
                  value={remarks}
                  onChange={e => {
                    setRemarks(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                />

                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#EF4444',
                      fontSize: '12px',
                      marginTop: '6px',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Confirm Ticket Completion
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Are you sure you want to mark <strong>{ticket.ticketNumber}</strong> as completed?
                  This will record your name as the resolver and calculate final delay/on-time SLA.
                </p>
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                  }}
                >
                  <strong>Solution:</strong> {remarks}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (confirmPrompt) setConfirmPrompt(false);
                else onClose();
              }}
            >
              {confirmPrompt ? 'Back to Edit' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-success">
              {confirmPrompt ? 'Yes, Mark as Done' : 'Continue to Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ReassignModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newAssigneeId: string, reason: string) => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({ ticket, isOpen, onClose, onSubmit }) => {
  const itPersons = masterDataService.getActiveITPersons();
  const [selectedIT, setSelectedIT] = useState(
    itPersons.find(u => u.id !== ticket.currentlyAssignedToId)?.id || itPersons[0]?.id || ''
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIT) {
      setError('Please select an IT person.');
      return;
    }
    if (!reason.trim()) {
      setError('Reassignment requires a mandatory reason and will be recorded in audit history.');
      return;
    }
    onSubmit(selectedIT, reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} color="var(--primary)" />
            <span>Reassign Ticket - {ticket.ticketNumber}</span>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: '14px', fontSize: '13px' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Currently Assigned To:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                {ticket.currentlyAssignedToName}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="reassign-select"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Reassign To <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="reassign-select"
                className="form-select"
                style={{ width: '100%' }}
                value={selectedIT}
                onChange={e => setSelectedIT(e.target.value)}
              >
                {itPersons.map((person: User) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label
                htmlFor="reassign-reason-input"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Reason for Reassignment <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="reassign-reason-input"
                rows={3}
                className="form-control"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="e.g. Bhupendra is on emergency leave, transfer to Alauddin for urgent gate pass dispatch..."
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#EF4444',
                  fontSize: '12px',
                  marginTop: '8px',
                }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm Reassignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
