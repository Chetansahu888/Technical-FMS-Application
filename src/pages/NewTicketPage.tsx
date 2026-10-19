import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { masterDataService } from '../services/masterDataService';
import { ticketService } from '../services/ticketService';
import { AttachmentViewer } from '../components/common/AttachmentViewer';
import { AppLayoutContextType } from '../components/layout/AppLayout';
import { Attachment, TicketCategory, Ticket } from '../types';
import {
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  FilePlus,
  Building,
  Layers,
  FileSpreadsheet,
  Link as LinkIcon,
} from 'lucide-react';

export const NewTicketPage: React.FC = () => {
  const { currentUser } = useAuth();
  const notification = useNotification();
  const navigate = useNavigate();
  const { openTicketDetails, refreshData } = useOutletContext<AppLayoutContextType>();

  const companies = masterDataService.getCompanies();
  const categories = masterDataService.getCategories();

  // Form states
  const [submissionType, setSubmissionType] = useState<'Self' | 'On Behalf'>('Self');
  const [onBehalfSelection, setOnBehalfSelection] = useState('');
  const [customOnBehalf, setCustomOnBehalf] = useState('');
  const [helpTicketNumber, setHelpTicketNumber] = useState('');
  const [company, setCompany] = useState(currentUser?.company || companies[0] || 'PMMPL');
  const [category, setCategory] = useState<TicketCategory>('Sheet/FMS');
  const [applicationName, setApplicationName] = useState('');
  const [sheetOrPageName, setSheetOrPageName] = useState('');
  const [systemUrl, setSystemUrl] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [whatHasToBeChanged, setWhatHasToBeChanged] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // System users for dropdown
  const systemUsers = masterDataService.getUsers();
  const staffRoleOptions = useMemo(() => {
    const list: string[] = [
      'Rahul Sharma (Store & Dispatch In-charge)',
      'Priya Patel (Purchase Executive)',
      'Amit Gupta (Quality Assurance Engineer)',
      'Vikram Joshi (Plant Head / Operations)',
      'Ramesh Kumar (Warehouse & Logistics Manager)',
      'Sunita Verma (Accounts & Finance In-charge)',
      'Deepak Singh (Production Line Supervisor)',
      'Neha Sharma (Human Resources Executive)',
      'Mohan Lal (Maintenance & Utility Supervisor)',
      'Anjali Mehta (Sales Coordinator)',
      'Suresh Verma (General Manager / Admin)',
    ];

    systemUsers.forEach(u => {
      const roleName =
        u.role === 'admin'
          ? 'Admin'
          : u.role === 'it_person'
          ? 'IT Specialist'
          : 'Employee';
      const label = `${u.name} (${roleName} - ${u.company})`;
      if (!list.includes(label)) {
        list.push(label);
      }
    });

    return list;
  }, [systemUsers]);

  // Validation & status states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const getEffectiveOnBehalf = (): string => {
    if (onBehalfSelection === 'Other') {
      return customOnBehalf.trim();
    }
    return onBehalfSelection.trim();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const effectiveOnBehalf = getEffectiveOnBehalf();

    if (submissionType === 'On Behalf' && !effectiveOnBehalf) {
      errs.onBehalfOf = 'Please select or enter the Name & Role for whom this ticket is being raised.';
    }

    if (!applicationName.trim()) {
      errs.applicationName = 'Please enter the FMS or Application name.';
    }

    if (!sheetOrPageName.trim()) {
      errs.sheetOrPageName = 'Please specify the Sheet, Tab or Page name.';
    }

    if (systemUrl.trim()) {
      try {
        const parsed = new URL(systemUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.systemUrl = 'URL must start with http:// or https://';
        }
      } catch {
        errs.systemUrl = 'Please enter a valid website or Google Sheet URL.';
      }
    }

    if (!problemDescription.trim()) {
      errs.problemDescription = 'Please describe the problem you are encountering.';
    } else if (problemDescription.trim().length < 10) {
      errs.problemDescription = 'Problem description must be at least 10 characters.';
    }

    if (!whatHasToBeChanged.trim()) {
      errs.whatHasToBeChanged = 'Please specify what needs to be changed or corrected.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notification.error('Error', 'Please sign in to raise a ticket.');
      return;
    }

    if (!validate()) {
      notification.warning('Validation Warning', 'Please check highlighted fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate minor async processing to prevent duplicate rapid clicks
      await new Promise(r => setTimeout(r, 450));

      const effectiveOnBehalf = getEffectiveOnBehalf();
      const newTicket = ticketService.createTicket({
        requester: currentUser,
        submissionType,
        onBehalfOf: submissionType === 'On Behalf' ? effectiveOnBehalf : undefined,
        helpTicketNumber: helpTicketNumber.trim() || undefined,
        company,
        category,
        applicationName,
        sheetOrPageName,
        systemUrl,
        problemDescription,
        whatHasToBeChanged,
        attachments,
      });

      setCreatedTicket(newTicket);
      refreshData();
      notification.success(
        'Ticket Created Successfully',
        `Ticket ${newTicket.ticketNumber} assigned to ${newTicket.currentlyAssignedToName}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save ticket';
      notification.error('Submission Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNew = () => {
    setCreatedTicket(null);
    setApplicationName('');
    setSheetOrPageName('');
    setSystemUrl('');
    setProblemDescription('');
    setWhatHasToBeChanged('');
    setAttachments([]);
    setHelpTicketNumber('');
    setOnBehalfSelection('');
    setCustomOnBehalf('');
    setSubmissionType('Self');
    setErrors({});
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Raise Technical Help Ticket</h1>
          <p>Submit issues for Google Sheets, FMS systems, Google Forms, websites and custom React applications.</p>
        </div>
      </div>

      {/* Success Notification Banner after saving */}
      {createdTicket ? (
        <div
          className="card"
          style={{
            borderColor: '#A7F3D0',
            background: '#ECFDF5',
            textAlign: 'center',
            padding: '36px 24px',
          }}
        >
          <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#064E3B', marginBottom: '6px' }}>
            Ticket Raised Successfully!
          </h2>
          <div style={{ fontSize: '15px', color: '#065F46', marginBottom: '8px' }}>
            Ticket Number: <strong>{createdTicket.ticketNumber}</strong>
          </div>
          <p style={{ fontSize: '13px', color: '#047857', maxWidth: '520px', margin: '0 auto 24px' }}>
            Your ticket has been assigned to <strong>{createdTicket.currentlyAssignedToName}</strong> under 
            round-robin balancing with SLA planned for{' '}
            <strong>{new Date(createdTicket.plannedDate).toLocaleDateString()}</strong>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openTicketDetails(createdTicket)}
            >
              <Eye size={15} />
              <span>View Ticket Details</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetForNew}
            >
              <FilePlus size={15} />
              <span>Raise Another Ticket</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/my-tickets')}
            >
              <span>Go to My Tickets</span>
            </button>
          </div>
        </div>
      ) : (
        /* Ticket Creation Form */
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-title">
              <Building size={16} color="var(--primary)" />
              <span>Requester & System Identification</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Submission Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Raising For <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="subType"
                      checked={submissionType === 'Self'}
                      onChange={() => setSubmissionType('Self')}
                    />
                    <span>By Self ({currentUser?.name})</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="subType"
                      checked={submissionType === 'On Behalf'}
                      onChange={() => setSubmissionType('On Behalf')}
                    />
                    <span>On Behalf</span>
                  </label>
                </div>
              </div>

              {/* On Behalf Of dropdown if selected */}
              {submissionType === 'On Behalf' && (
                <div>
                  <label htmlFor="on-behalf-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    On Behalf Of (Name & Role) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="on-behalf-select"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={onBehalfSelection}
                    onChange={e => setOnBehalfSelection(e.target.value)}
                  >
                    <option value="">-- Select Person (Name & Role) --</option>
                    {staffRoleOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="Other">-- Other (Type Name & Role) --</option>
                  </select>

                  {onBehalfSelection === 'Other' && (
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', marginTop: '8px' }}
                      placeholder="e.g. Ramesh Kumar (Store In-charge)"
                      value={customOnBehalf}
                      onChange={e => setCustomOnBehalf(e.target.value)}
                    />
                  )}

                  {errors.onBehalfOf && (
                    <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                      {errors.onBehalfOf}
                    </div>
                  )}
                </div>
              )}

              {/* Company */}
              <div>
                <label htmlFor="company-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Company <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  id="company-select"
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

              {/* Category */}
              <div>
                <label htmlFor="category-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Category <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  id="category-select"
                  className="form-select"
                  style={{ width: '100%' }}
                  value={category}
                  onChange={e => setCategory(e.target.value as TicketCategory)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Helpdesk Reference */}
              <div>
                <label htmlFor="helpdesk-ref" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  External Help Ticket (Optional)
                </label>
                <input
                  id="helpdesk-ref"
                  type="text"
                  className="form-control"
                  style={{ width: '100%' }}
                  placeholder="e.g. HD-9842"
                  value={helpTicketNumber}
                  onChange={e => setHelpTicketNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* System & Location Details */}
          <div className="card">
            <div className="card-title">
              <Layers size={16} color="var(--primary)" />
              <span>Application & Target Details</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label htmlFor="app-name-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  FMS / Application Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="app-name-input"
                  type="text"
                  className="form-control"
                  style={{ width: '100%' }}
                  placeholder="e.g. Purchase Order FMS or Customer Portal"
                  value={applicationName}
                  onChange={e => setApplicationName(e.target.value)}
                />
                {errors.applicationName && (
                  <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                    {errors.applicationName}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="sheet-name-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Sheet / Tab / Page Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="sheet-name-input"
                  type="text"
                  className="form-control"
                  style={{ width: '100%' }}
                  placeholder="e.g. Vendor Inward Tab or /checkout page"
                  value={sheetOrPageName}
                  onChange={e => setSheetOrPageName(e.target.value)}
                />
                {errors.sheetOrPageName && (
                  <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                    {errors.sheetOrPageName}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="url-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                System / Page URL (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="url-input"
                  type="url"
                  className="form-control"
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={systemUrl}
                  onChange={e => setSystemUrl(e.target.value)}
                />
                <LinkIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {errors.systemUrl && (
                <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                  {errors.systemUrl}
                </div>
              )}
            </div>
          </div>

          {/* Problem & Correction Descriptions */}
          <div className="card">
            <div className="card-title">
              <FileSpreadsheet size={16} color="var(--primary)" />
              <span>Problem Description & Requested Correction</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="problem-desc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Problem Encountered <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="problem-desc"
                rows={4}
                className="form-control"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Explain the error message, incorrect calculation, macro failure, or form problem in detail..."
                value={problemDescription}
                onChange={e => setProblemDescription(e.target.value)}
              />
              {errors.problemDescription && (
                <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                  {errors.problemDescription}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="correction-desc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                What Has To Be Changed <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="correction-desc"
                rows={4}
                className="form-control"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Specify the exact expected behavior, corrected formula, dropdown options to add, or column adjustments..."
                value={whatHasToBeChanged}
                onChange={e => setWhatHasToBeChanged(e.target.value)}
              />
              {errors.whatHasToBeChanged && (
                <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                  {errors.whatHasToBeChanged}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Screenshots / PDF Attachments
              </label>
              <AttachmentViewer
                attachments={attachments}
                onUpload={setAttachments}
                onRemove={id => setAttachments(prev => prev.filter(a => a.id !== id))}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '160px' }}
            >
              <PlusCircle size={15} />
              <span>{isSubmitting ? 'Submitting Ticket...' : 'Submit Ticket'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
