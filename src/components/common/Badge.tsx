import React from 'react';
import { TicketStatus } from '../../types';
import { Clock, CheckCircle2, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { getTicketDelayInfo } from '../../services/dateUtils';

interface BadgeProps {
  status: TicketStatus;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const normalizedClass = status.replace(/\s+/g, '-');
  
  let Icon = Clock;
  if (status === 'In Progress') Icon = PlayCircle;
  if (status === 'Hold') Icon = PauseCircle;
  if (status === 'Completed') Icon = CheckCircle2;

  return (
    <span className={`status-badge status-${normalizedClass}`}>
      <Icon size={13} />
      <span>{status}</span>
    </span>
  );
};

interface DelayBadgeProps {
  plannedDate: string;
  actualDate?: string;
  status: TicketStatus;
}

export const DelayBadge: React.FC<DelayBadgeProps> = ({ plannedDate, actualDate, status }) => {
  const info = getTicketDelayInfo(plannedDate, actualDate);

  if (status === 'Completed') {
    if (info.isOverdue) {
      return (
        <span className="overdue-tag" title="Resolved after planned date">
          <AlertTriangle size={12} />
          <span>Delayed by {info.delayFormatted}</span>
        </span>
      );
    }
    return (
      <span className="remaining-tag" style={{ color: '#059669', background: '#ECFDF5' }}>
        <CheckCircle2 size={12} />
        <span>Completed On Time</span>
      </span>
    );
  }

  // Not completed yet
  if (info.isOverdue) {
    return (
      <span className="overdue-tag">
        <AlertTriangle size={12} />
        <span>{info.delayFormatted}</span>
      </span>
    );
  }

  return (
    <span className="remaining-tag">
      <Clock size={12} />
      <span>{info.remainingFormatted}</span>
    </span>
  );
};
