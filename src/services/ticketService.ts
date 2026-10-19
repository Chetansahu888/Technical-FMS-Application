import { Ticket, TicketStatus, TicketActivity, User, Attachment, TicketCategory } from '../types';
import { INITIAL_TICKETS } from './seedData';
import { masterDataService } from './masterDataService';
import { calculatePlannedDate, getTicketDelayInfo, formatISTDateTime } from './dateUtils';
import { googleSheetsAdapter } from './googleSheetsAdapter';

const TICKETS_KEY = 'tech_fms_tickets';
const SEQUENCE_KEY = 'tech_fms_sequence';

export interface TicketFilterOptions {
  search?: string;
  status?: string; // 'All' or TicketStatus or 'Overdue'
  company?: string;
  category?: string;
  itPersonId?: string;
  requesterId?: string;
  dateBasis?: 'requestDate' | 'plannedDate' | 'actualDate';
  startDate?: string;
  endDate?: string;
}

class TicketService {
  /**
   * Retrieves all tickets from local persistence or seed
   */
  getTickets(): Ticket[] {
    try {
      const stored = localStorage.getItem(TICKETS_KEY);
      if (stored) {
        const parsed: Ticket[] = JSON.parse(stored);
        let updated = false;
        parsed.forEach(t => {
          if (t.ticketNumber && t.ticketNumber.startsWith('TKT-2026-')) {
            const num = parseInt(t.ticketNumber.replace('TKT-2026-', ''), 10);
            t.ticketNumber = `TH - ${String(num).padStart(2, '0')}`;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(TICKETS_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(TICKETS_KEY, JSON.stringify(INITIAL_TICKETS));
    return INITIAL_TICKETS;
  }

  /**
   * Persists ticket array
   */
  saveTickets(tickets: Ticket[]): void {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }

  /**
   * Finds ticket by permanent ID or display number
   */
  getTicketById(id: string): Ticket | undefined {
    return this.getTickets().find(t => t.id === id || t.ticketNumber === id);
  }

  /**
   * Generates display ticket number atomically (e.g. TH - 01, TH - 06)
   */
  private generateNextTicketNumber(): string {
    let nextSeq = 6;
    try {
      const stored = localStorage.getItem(SEQUENCE_KEY);
      if (stored) {
        nextSeq = parseInt(stored, 10);
      } else {
        const tickets = this.getTickets();
        nextSeq = tickets.length + 1;
      }
    } catch {
      nextSeq = 6;
    }
    localStorage.setItem(SEQUENCE_KEY, String(nextSeq + 1));
    return `TH - ${String(nextSeq).padStart(2, '0')}`;
  }

  /**
   * Round-robin auto-assignment
   */
  private getNextAssignedITPerson(): User {
    const itPersons = masterDataService.getActiveITPersons();
    if (itPersons.length === 0) {
      return {
        id: 'usr_unassigned',
        name: 'IT Helpdesk Queue',
        email: 'it.helpdesk@company.com',
        role: 'it_person',
        company: 'PMMPL',
        active: true,
      };
    }

    const settings = masterDataService.getSettings();
    const index = (settings.autoAssignRoundRobinIndex || 0) % itPersons.length;
    const assigned = itPersons[index];

    // Increment index
    settings.autoAssignRoundRobinIndex = (index + 1) % itPersons.length;
    masterDataService.saveSettings(settings);

    return assigned;
  }

  /**
   * Create a new ticket
   */
  createTicket(payload: {
    requester: User;
    submissionType: 'Self' | 'On Behalf';
    onBehalfOf?: string;
    helpTicketNumber?: string;
    company: string;
    category: TicketCategory;
    applicationName: string;
    sheetOrPageName: string;
    systemUrl?: string;
    problemDescription: string;
    whatHasToBeChanged: string;
    attachments: Attachment[];
  }): Ticket {
    const tickets = this.getTickets();
    const settings = masterDataService.getSettings();

    const now = new Date();
    const requestDate = now.toISOString();
    const ticketNumber = this.generateNextTicketNumber();
    const internalId = `tkt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const assignee = this.getNextAssignedITPerson();
    const plannedDate = calculatePlannedDate(
      requestDate,
      settings.workingDays,
      settings.slaWorkingDays
    );

    const initialActivity: TicketActivity = {
      id: `act_${Date.now()}_create`,
      ticketId: internalId,
      timestamp: requestDate,
      actorId: payload.requester.id,
      actorName: payload.requester.name,
      actorRole: payload.requester.role,
      action: 'Created',
      remarks: payload.submissionType === 'On Behalf'
        ? `Created on behalf of ${payload.onBehalfOf}`
        : 'Ticket submitted via Helpdesk Portal.',
      toStatus: 'Pending',
    };

    const assignActivity: TicketActivity = {
      id: `act_${Date.now()}_assign`,
      ticketId: internalId,
      timestamp: new Date(now.getTime() + 1000).toISOString(),
      actorId: 'system',
      actorName: 'System Round-Robin',
      actorRole: 'admin',
      action: 'Assigned',
      remarks: `Assigned automatically to ${assignee.name}.`,
      toStatus: 'Pending',
    };

    const newTicket: Ticket = {
      id: internalId,
      ticketNumber,
      requestDate,
      requesterId: payload.requester.id,
      requesterName: payload.requester.name,
      requesterEmail: payload.requester.email,
      submissionType: payload.submissionType,
      onBehalfOf: payload.onBehalfOf,
      helpTicketNumber: payload.helpTicketNumber,
      company: payload.company,
      category: payload.category,
      applicationName: payload.applicationName.trim(),
      sheetOrPageName: payload.sheetOrPageName.trim(),
      systemUrl: payload.systemUrl?.trim() || undefined,
      problemDescription: payload.problemDescription.trim(),
      whatHasToBeChanged: payload.whatHasToBeChanged.trim(),
      attachments: payload.attachments || [],
      originallyAssignedToId: assignee.id,
      originallyAssignedToName: assignee.name,
      currentlyAssignedToId: assignee.id,
      currentlyAssignedToName: assignee.name,
      status: 'Pending',
      plannedDate,
      activityLog: [initialActivity, assignActivity],
    };

    tickets.unshift(newTicket);
    this.saveTickets(tickets);
    this.syncTicketToSheet(newTicket);
    return newTicket;
  }

  /**
   * Action: Start Work
   */
  startWork(ticketId: string, actor: User): Ticket {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'Pending') {
      throw new Error('Can only start work from Pending status');
    }

    const now = new Date().toISOString();
    const prevStatus = ticket.status;
    ticket.status = 'In Progress';

    ticket.activityLog.push({
      id: `act_${Date.now()}_start`,
      ticketId: ticket.id,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'Started',
      remarks: 'Work initiated by IT staff.',
      fromStatus: prevStatus,
      toStatus: 'In Progress',
    });

    this.saveTickets(tickets);
    this.syncTicketToSheet(ticket);
    return ticket;
  }

  /**
   * Action: Put on Hold (requires mandatory reason)
   */
  holdWork(ticketId: string, holdReason: string, actor: User): Ticket {
    const trimmedReason = holdReason.trim();
    if (!trimmedReason) throw new Error('Hold reason is mandatory.');

    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'In Progress') {
      throw new Error('Can only hold tickets that are currently In Progress');
    }

    const now = new Date().toISOString();
    const prevStatus = ticket.status;
    ticket.status = 'Hold';
    ticket.holdReason = trimmedReason;

    ticket.activityLog.push({
      id: `act_${Date.now()}_hold`,
      ticketId: ticket.id,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'Put on Hold',
      remarks: trimmedReason,
      fromStatus: prevStatus,
      toStatus: 'Hold',
    });

    this.saveTickets(tickets);
    this.syncTicketToSheet(ticket);
    return ticket;
  }

  /**
   * Action: Resume Work
   */
  resumeWork(ticketId: string, actor: User): Ticket {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'Hold') {
      throw new Error('Can only resume tickets that are on Hold');
    }

    const now = new Date().toISOString();
    const prevStatus = ticket.status;
    ticket.status = 'In Progress';

    ticket.activityLog.push({
      id: `act_${Date.now()}_resume`,
      ticketId: ticket.id,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'Resumed',
      remarks: 'Work resumed from Hold.',
      fromStatus: prevStatus,
      toStatus: 'In Progress',
    });

    this.saveTickets(tickets);
    this.syncTicketToSheet(ticket);
    return ticket;
  }

  /**
   * Action: Mark Done (requires mandatory solution remarks)
   */
  markDone(ticketId: string, solutionRemarks: string, actor: User): Ticket {
    const trimmedRemarks = solutionRemarks.trim();
    if (!trimmedRemarks) throw new Error('Solution remarks are mandatory.');

    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'Completed') {
      throw new Error('Ticket has already been completed.');
    }
    if (ticket.status !== 'In Progress') {
      throw new Error('Can only mark done tickets that are In Progress');
    }

    const now = new Date().toISOString();
    const prevStatus = ticket.status;
    ticket.status = 'Completed';
    ticket.actualDate = now;
    ticket.resolvedById = actor.id;
    ticket.resolvedByName = actor.name;
    ticket.solutionRemarks = trimmedRemarks;

    ticket.activityLog.push({
      id: `act_${Date.now()}_done`,
      ticketId: ticket.id,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'Completed',
      remarks: trimmedRemarks,
      fromStatus: prevStatus,
      toStatus: 'Completed',
    });

    this.saveTickets(tickets);
    this.syncTicketToSheet(ticket);
    return ticket;
  }

  /**
   * Action: Reassign Ticket (Admin only, requires reason)
   */
  reassignTicket(ticketId: string, newAssigneeId: string, reason: string, actor: User): Ticket {
    const trimmedReason = reason.trim();
    if (!trimmedReason) throw new Error('Reassignment reason is mandatory.');

    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'Completed') {
      throw new Error('Completed tickets cannot be reassigned.');
    }

    const users = masterDataService.getUsers();
    const newAssignee = users.find(u => u.id === newAssigneeId);
    if (!newAssignee) throw new Error('Assignee user not found');

    const previousAssigneeName = ticket.currentlyAssignedToName;
    ticket.currentlyAssignedToId = newAssignee.id;
    ticket.currentlyAssignedToName = newAssignee.name;

    ticket.activityLog.push({
      id: `act_${Date.now()}_reassign`,
      ticketId: ticket.id,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'Reassigned',
      remarks: `Reassigned from ${previousAssigneeName} to ${newAssignee.name}. Reason: ${trimmedReason}`,
    });

    this.saveTickets(tickets);
    this.syncTicketToSheet(ticket);
    return ticket;
  }

  /**
   * Action: Delete Ticket (removes from React state & syncs deletion to Google Sheet)
   */
  async deleteTicket(ticketId: string): Promise<Ticket> {
    const tickets = this.getTickets();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index === -1) throw new Error('Ticket not found');

    const [deleted] = tickets.splice(index, 1);
    this.saveTickets(tickets);

    // Sync deletion to Google Sheet
    if (googleSheetsAdapter.isConnected() && deleted.ticketNumber) {
      try {
        await googleSheetsAdapter.deleteTicketInSheet(deleted.ticketNumber);
      } catch (err) {
        console.warn('Failed to delete from Google Sheet:', err);
      }
    }

    return deleted;
  }

  /**
   * Filters tickets according to criteria
   */
  filterTickets(tickets: Ticket[], options: TicketFilterOptions): Ticket[] {
    return tickets.filter(ticket => {
      // Search
      if (options.search && options.search.trim()) {
        const q = options.search.toLowerCase().trim();
        const match =
          ticket.ticketNumber.toLowerCase().includes(q) ||
          ticket.applicationName.toLowerCase().includes(q) ||
          ticket.requesterName.toLowerCase().includes(q) ||
          ticket.problemDescription.toLowerCase().includes(q) ||
          ticket.sheetOrPageName.toLowerCase().includes(q) ||
          ticket.company.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status
      if (options.status && options.status !== 'All') {
        if (options.status === 'Overdue') {
          const delayInfo = getTicketDelayInfo(ticket.plannedDate, ticket.actualDate);
          if (!delayInfo.isOverdue || ticket.status === 'Completed') return false;
        } else if (ticket.status !== options.status) {
          return false;
        }
      }

      // Company
      if (options.company && options.company !== 'All') {
        if (ticket.company !== options.company) return false;
      }

      // Category
      if (options.category && options.category !== 'All') {
        if (ticket.category !== options.category) return false;
      }

      // IT Person
      if (options.itPersonId && options.itPersonId !== 'All') {
        if (ticket.currentlyAssignedToId !== options.itPersonId) return false;
      }

      // Requester
      if (options.requesterId && options.requesterId !== 'All') {
        if (ticket.requesterId !== options.requesterId) return false;
      }

      // Date Range & Basis
      if (options.startDate || options.endDate) {
        const basisField = options.dateBasis || 'requestDate';
        const targetDateStr = ticket[basisField];
        if (!targetDateStr) return false;

        const targetTime = new Date(targetDateStr).getTime();
        if (options.startDate) {
          const startTime = new Date(options.startDate).getTime();
          if (targetTime < startTime) return false;
        }
        if (options.endDate) {
          // Include end of day
          const endObj = new Date(options.endDate);
          endObj.setHours(23, 59, 59, 999);
          if (targetTime > endObj.getTime()) return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculates dashboard summary
   */
  getDashboardStats(companyFilter?: string, dateRange?: { start?: string; end?: string }) {
    const all = this.getTickets();
    let tickets = all;

    if (companyFilter && companyFilter !== 'All') {
      tickets = tickets.filter(t => t.company === companyFilter);
    }
    if (dateRange?.start) {
      const s = new Date(dateRange.start).getTime();
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() >= s);
    }
    if (dateRange?.end) {
      const e = new Date(dateRange.end);
      e.setHours(23, 59, 59, 999);
      tickets = tickets.filter(t => new Date(t.requestDate).getTime() <= e.getTime());
    }

    const total = tickets.length;
    let pending = 0;
    let inProgress = 0;
    let hold = 0;
    let completed = 0;
    let overdue = 0;

    tickets.forEach(t => {
      if (t.status === 'Pending') pending++;
      else if (t.status === 'In Progress') inProgress++;
      else if (t.status === 'Hold') hold++;
      else if (t.status === 'Completed') completed++;

      // Check overdue flag (uncompleted past planned)
      const delayInfo = getTicketDelayInfo(t.plannedDate, t.actualDate);
      if (delayInfo.isOverdue && t.status !== 'Completed') {
        overdue++;
      }
    });

    // Workload summary per IT person
    const itPersons = masterDataService.getUsers().filter(u => u.role === 'it_person');
    const workload = itPersons.map(person => {
      const assignedTickets = tickets.filter(t => t.currentlyAssignedToId === person.id);
      let pCount = 0, ipCount = 0, hCount = 0, cCount = 0, oCount = 0;

      assignedTickets.forEach(t => {
        if (t.status === 'Pending') pCount++;
        else if (t.status === 'In Progress') ipCount++;
        else if (t.status === 'Hold') hCount++;
        else if (t.status === 'Completed') cCount++;

        const delay = getTicketDelayInfo(t.plannedDate, t.actualDate);
        if (delay.isOverdue && t.status !== 'Completed') oCount++;
      });

      return {
        itPerson: person,
        totalAssigned: assignedTickets.length,
        pending: pCount,
        inProgress: ipCount,
        hold: hCount,
        completed: cCount,
        overdue: oCount,
      };
    });

    return {
      total,
      pending,
      inProgress,
      hold,
      completed,
      overdue,
      workload,
    };
  }

  /**
   * Generates properly formatted and escaped CSV for MIS/Reports
   */
  generateCSV(tickets: Ticket[]): string {
    const headers = [
      'Ticket Number',
      'Request Timestamp (IST)',
      'Company',
      'Requester',
      'Category',
      'Application',
      'Sheet/Page',
      'Originally Assigned To',
      'Currently Assigned To',
      'Resolved By',
      'Planned (IST)',
      'Actual (IST)',
      'Delay / Overdue',
      'Status',
      'Solution Remarks'
    ];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = tickets.map(t => {
      const delayInfo = getTicketDelayInfo(t.plannedDate, t.actualDate);
      const delayText = t.status === 'Completed'
        ? delayInfo.delayFormatted
        : delayInfo.isOverdue ? delayInfo.delayFormatted : delayInfo.remainingFormatted;

      return [
        t.ticketNumber,
        formatISTDateTime(t.requestDate),
        t.company,
        t.requesterName,
        t.category,
        t.applicationName,
        t.sheetOrPageName,
        t.originallyAssignedToName,
        t.currentlyAssignedToName,
        t.resolvedByName || '-',
        formatISTDateTime(t.plannedDate),
        t.actualDate ? formatISTDateTime(t.actualDate) : '-',
        delayText,
        t.status,
        t.solutionRemarks || '-'
      ].map(escapeCSV).join(',');
    });

    return [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  }

  /**
   * Asynchronously sync ticket changes to Google Sheet in background
   */
  private syncTicketToSheet(ticket: Ticket): void {
    if (googleSheetsAdapter.isConnected()) {
      googleSheetsAdapter.upsertTicket(ticket).catch(err => {
        console.warn('Background Google Sheet sync warning:', err);
      });
    }
  }

  /**
   * Bi-directional sync: Fetches tickets from Google Sheet FMS and merges into React state.
   * If a ticket was removed/deleted from Google Sheet, it removes it from React state as well!
   */
  async syncFromSheet(): Promise<{ success: boolean; count: number; hasChanges: boolean; message: string }> {
    const res = await googleSheetsAdapter.fetchTicketsFromSheet();
    if (!res.success || !res.tickets) {
      return { success: false, count: 0, hasChanges: false, message: res.message || 'Failed to fetch tickets from Sheet' };
    }

    const currentTickets = this.getTickets();
    const sheetTickets = res.tickets;

    // Helper to normalize: "TH - 09" -> "TH09", "TH - 9" -> "TH09"
    const normalizeNum = (num?: string): string => {
      if (!num) return '';
      const cleaned = num.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const match = cleaned.match(/^([A-Z]+)(\d+)$/);
      if (match) {
        return `${match[1]}${match[2].padStart(2, '0')}`;
      }
      return cleaned;
    };

    // Map of active tickets from Sheet
    const sheetMap = new Map<string, typeof sheetTickets[0]>();
    sheetTickets.forEach(st => {
      const norm = normalizeNum(st.ticketNumber);
      if (norm) {
        sheetMap.set(norm, st);
      }
    });

    let updatedCount = 0;
    let deletedCount = 0;
    let hasChanges = false;

    // 1. Keep only tickets that exist in the Sheet
    // If deleted from Sheet, it will NOT be in sheetMap, so it gets removed from React!
    const retainedTickets: Ticket[] = [];

    currentTickets.forEach(existing => {
      const norm = normalizeNum(existing.ticketNumber);
      if (sheetMap.has(norm)) {
        const sheetTkt = sheetMap.get(norm)!;
        let modified = false;
        if (sheetTkt.status && ['Pending', 'In Progress', 'Hold', 'Completed'].includes(sheetTkt.status) && existing.status !== sheetTkt.status) {
          existing.status = sheetTkt.status as TicketStatus;
          modified = true;
        }
        if (sheetTkt.company && existing.company !== sheetTkt.company) {
          existing.company = sheetTkt.company;
          modified = true;
        }
        if (sheetTkt.currentlyAssignedToName && existing.currentlyAssignedToName !== sheetTkt.currentlyAssignedToName) {
          existing.currentlyAssignedToName = sheetTkt.currentlyAssignedToName;
          modified = true;
        }
        if (sheetTkt.problemDescription && existing.problemDescription !== sheetTkt.problemDescription) {
          existing.problemDescription = sheetTkt.problemDescription;
          modified = true;
        }
        if (sheetTkt.whatHasToBeChanged && existing.whatHasToBeChanged !== sheetTkt.whatHasToBeChanged) {
          existing.whatHasToBeChanged = sheetTkt.whatHasToBeChanged;
          modified = true;
        }
        if (sheetTkt.actualDate && existing.actualDate !== sheetTkt.actualDate) {
          existing.actualDate = sheetTkt.actualDate;
          modified = true;
        }
        if (modified) hasChanges = true;
        retainedTickets.push(existing);
        updatedCount++;
      } else {
        // Was deleted in Google Sheet!
        deletedCount++;
        hasChanges = true;
      }
    });

    // 2. Add any new tickets created directly in Sheet
    sheetTickets.forEach(sheetTkt => {
      const norm = normalizeNum(sheetTkt.ticketNumber);
      const alreadyPresent = retainedTickets.some(t => normalizeNum(t.ticketNumber) === norm);
      if (!alreadyPresent) {
        hasChanges = true;
        const newTicket: Ticket = {
          id: `tkt_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ticketNumber: sheetTkt.ticketNumber,
          requestDate: sheetTkt.requestDate || new Date().toISOString(),
          requesterId: 'usr_sheet',
          requesterName: sheetTkt.requesterName || 'Google Sheet User',
          requesterEmail: 'user@company.com',
          submissionType: 'Self',
          company: sheetTkt.company || 'PMMPL',
          category: 'Sheet/FMS',
          applicationName: sheetTkt.applicationName || 'General Application',
          problemDescription: sheetTkt.problemDescription || 'Ticket imported from Google Sheet FMS',
          whatHasToBeChanged: sheetTkt.whatHasToBeChanged || 'See Problem Summary',
          originallyAssignedToId: 'usr_it_bhupendra',
          originallyAssignedToName: sheetTkt.currentlyAssignedToName || 'Bhupendra',
          currentlyAssignedToId: 'usr_it_bhupendra',
          currentlyAssignedToName: sheetTkt.currentlyAssignedToName || 'Bhupendra',
          status: (sheetTkt.status as TicketStatus) || 'Pending',
          plannedDate: sheetTkt.plannedDate || new Date().toISOString(),
          actualDate: sheetTkt.actualDate || undefined,
          attachments: [],
          activityLog: [
            {
              id: `act_${Date.now()}`,
              ticketId: `tkt_sheet_${Date.now()}`,
              timestamp: new Date().toISOString(),
              actorId: 'usr_sheet',
              actorName: 'Google Sheets FMS',
              actorRole: 'admin',
              action: 'Created',
              remarks: 'Synced from Google Sheet FMS',
            },
          ],
        };
        retainedTickets.unshift(newTicket);
        updatedCount++;
      }
    });

    if (hasChanges) {
      this.saveTickets(retainedTickets);
    }

    return {
      success: true,
      count: updatedCount,
      hasChanges,
      message: `Synchronized: ${retainedTickets.length} active tickets${deletedCount > 0 ? ` (${deletedCount} removed that were deleted from Sheet)` : ''}.`,
    };
  }

  /**
   * Resets demo data to initial state
   */
  resetDemoData(): void {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(INITIAL_TICKETS));
    localStorage.setItem(SEQUENCE_KEY, '6');
  }
}

export const ticketService = new TicketService();
