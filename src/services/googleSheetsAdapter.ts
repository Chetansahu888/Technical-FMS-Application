/**
 * Google Sheets & Apps Script Integration Adapter
 * Sheet: FMS
 * Bi-directional synchronization between React and Google Sheets.
 * Dynamic header detection: Never overwrites "Planned" or "Delay" formula columns.
 * Formats completion and request timestamps as MM/DD/YYYY HH:MM:SS.
 */

import { Ticket, TicketStatus } from '../types';
import { masterDataService } from './masterDataService';
import { formatISTDateTime } from './dateUtils';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  timestamp: string;
}

class GoogleSheetsAdapter {
  private sheetName = import.meta.env.VITE_GOOGLE_SHEET_NAME || 'FMS';

  /**
   * Get configured Google Apps Script Web App URL
   */
  getEndpointUrl(): string {
    const settings = masterDataService.getSettings();
    return (settings.googleAppsScriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '').trim();
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    const url = this.getEndpointUrl();
    return Boolean(url && url.startsWith('http'));
  }

  /**
   * Formats a ticket for Apps Script upsert
   * Columns matched dynamically by header name:
   * Ticket # | Request Date (IST) | Company | Requester | Application & Page | Problem Summary | System / Page URL | Assigned To | Reassign | Helpdesk Ref / Ticket | Status | Overdue / Remaining | Planned | Actual | Delay
   */
  formatTicketForSheet(ticket: Ticket): Record<string, unknown> {
    const isCompleted = ticket.status === 'Completed';

    // Format actual date as MM/DD/YYYY HH:MM:SS only if completed
    let actualFormatted = '';
    if (isCompleted) {
      actualFormatted = formatISTDateTime(ticket.actualDate || new Date().toISOString());
      if (actualFormatted === '-') {
        actualFormatted = formatISTDateTime(new Date().toISOString());
      }
    }

    const requestDateFormatted = formatISTDateTime(ticket.requestDate);

    // Latest reassign info
    const reassignLog = ticket.activityLog?.find(a => a.action === 'Reassigned');
    const reassignInfo = reassignLog ? `${ticket.currentlyAssignedToName} (${reassignLog.remarks || ''})` : '';

    // Drive links of uploaded attachments
    const driveLinks = (ticket.attachments || [])
      .map(a => a.url)
      .filter(Boolean)
      .join('\n');

    return {
      ticketNumber: ticket.ticketNumber,
      requestDate: requestDateFormatted,
      company: ticket.company,
      requester: ticket.requesterName,
      applicationAndPage: `${ticket.applicationName}${ticket.sheetOrPageName ? ' - ' + ticket.sheetOrPageName : ''}`,
      problemSummary: ticket.problemDescription,
      whatHasToBeChanged: ticket.whatHasToBeChanged || '',
      systemUrl: ticket.systemUrl || '',
      assignedTo: ticket.currentlyAssignedToName || ticket.originallyAssignedToName || '',
      reassign: reassignInfo,
      helpdeskRef: ticket.helpTicketNumber || '',
      status: ticket.status,
      overdueRemaining: isCompleted ? 'Completed' : (ticket.status === 'Hold' ? 'On Hold' : 'In Progress'),
      actual: actualFormatted,
      driveLink: driveLinks,
      // Note: "planned" and "delay" are intentionally omitted so formulas in sheet are preserved
    };
  }

  /**
   * Upsert a single ticket to Google Sheet (called on ticket create/edit/status change)
   */
  async upsertTicket(ticket: Ticket): Promise<SyncResult> {
    const endpoint = this.getEndpointUrl();
    if (!endpoint) {
      return {
        success: false,
        message: 'Google Apps Script URL is not configured.',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const payload = {
        action: 'UPSERT_TICKET',
        sheetName: this.sheetName,
        ticket: this.formatTicketForSheet(ticket),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: Boolean(result && result.success),
        message: result.message || `Ticket ${ticket.ticketNumber} updated in Sheet`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      console.warn('Google Sheet upsert error:', errorMsg);
      return {
        success: false,
        message: `Sheet sync error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch all tickets from Google Sheet FMS to sync into React
   */
  async fetchTicketsFromSheet(): Promise<{ success: boolean; tickets: Partial<Ticket>[]; message?: string }> {
    const endpoint = this.getEndpointUrl();
    if (!endpoint) {
      return { success: false, tickets: [], message: 'Apps Script URL not configured' };
    }

    try {
      // Use GET with action parameter or POST fallback
      const urlWithParam = endpoint.includes('?') 
        ? `${endpoint}&action=GET_TICKETS&sheetName=${this.sheetName}&t=${Date.now()}`
        : `${endpoint}?action=GET_TICKETS&sheetName=${this.sheetName}&t=${Date.now()}`;

      const response = await fetch(urlWithParam, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result && result.success && Array.isArray(result.tickets)) {
        return {
          success: true,
          tickets: result.tickets,
          message: `Fetched ${result.tickets.length} tickets from Sheet`,
        };
      } else {
        throw new Error(result?.error || 'Invalid sheet response');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
      console.warn('Failed to fetch from Google Sheets:', errorMsg);
      return {
        success: false,
        tickets: [],
        message: errorMsg,
      };
    }
  }

  /**
   * Sync all existing React tickets to Google Sheet in bulk
   */
  async syncAllTicketsToSheet(tickets: Ticket[]): Promise<SyncResult> {
    const endpoint = this.getEndpointUrl();
    if (!endpoint) {
      return {
        success: false,
        message: 'Google Apps Script URL is not configured.',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const formatted = tickets.map(t => this.formatTicketForSheet(t));
      const payload = {
        action: 'SYNC_ALL_TICKETS',
        sheetName: this.sheetName,
        tickets: formatted,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return {
        success: Boolean(result && result.success),
        message: result.message || `Synced ${tickets.length} tickets to Sheet`,
        syncedCount: tickets.length,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        message: `Bulk sync error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Deletes a ticket row in Google Sheet by Ticket Number
   */
  async deleteTicketInSheet(ticketNumber: string): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected()) {
      return { success: false, message: 'Google Sheet not connected' };
    }

    const endpoint = this.getDirectEndpoint();
    try {
      const payload = {
        action: 'DELETE_TICKET',
        sheetName: this.sheetName,
        ticketNumber,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return {
        success: Boolean(result && result.success),
        message: result.message || `Deleted ticket ${ticketNumber} from sheet`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        message: `Delete error: ${errorMsg}`,
      };
    }
  }

  /**
   * Generates the complete Google Apps Script code for both Sheet FMS and Drive Uploads
   */
  getCompleteAppsScriptCode(folderId: string = '1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5'): string {
    return `/**
 * =========================================================================
 * Technical Help FMS - Google Sheet & Google Drive Unified Backend
 * Sheet Name: FMS
 * Target Drive Folder ID: ${folderId}
 * 
 * FEATURES:
 * - Dynamic column header detection (auto reads row 6 or any header row)
 * - Never overwrites "Planned" and "Delay" columns (Formulas are 100% safe!)
 * - Writes "Actual" completion date in MM/DD/YYYY HH:MM:SS format
 * - Bi-directional sync: React <-> Google Sheet
 * - Auto deletes rows when deleted in React or Sheet
 * - Google Drive Image & PDF uploads in target folder
 * =========================================================================
 */

const SHEET_NAME = "FMS";
const TARGET_FOLDER_ID = "${folderId}";

// --- HTTP POST HANDLER (Upsert Ticket, Bulk Sync, Delete Ticket, Drive Upload) ---
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // 1. Google Drive File Upload
    if (action === "UPLOAD_FILE") {
      return handleFileUpload(data);
    }

    // 2. Upsert Single Ticket to Sheet FMS
    if (action === "UPSERT_TICKET") {
      return handleUpsertTicket(data.ticket, data.sheetName || SHEET_NAME);
    }

    // 3. Sync All Tickets in Bulk
    if (action === "SYNC_ALL_TICKETS") {
      return handleBulkSync(data.tickets, data.sheetName || SHEET_NAME);
    }

    // 4. Delete Ticket in Sheet FMS
    if (action === "DELETE_TICKET") {
      return handleDeleteTicket(data.ticketNumber, data.sheetName || SHEET_NAME);
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// --- HTTP GET HANDLER (Read Tickets from Sheet FMS) ---
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "GET_TICKETS";
    const sheetName = (e && e.parameter && e.parameter.sheetName) || SHEET_NAME;

    if (action === "GET_TICKETS") {
      return handleGetTickets(sheetName);
    }

    return jsonResponse({
      status: "online",
      sheet: sheetName,
      folderId: TARGET_FOLDER_ID,
      message: "Technical Help FMS API is active"
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ==========================================
// CORE SHEET LOGIC: DYNAMIC HEADER ENGINE
// ==========================================

function getSheetContext(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const scanRows = Math.min(lastRow, 15);
  const data = sheet.getRange(1, 1, scanRows, lastCol).getValues();

  // Find header row containing "Ticket"
  let headerRowIndex = -1;
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const val = String(data[r][c]).toLowerCase();
      if (val.includes("ticket")) {
        headerRowIndex = r + 1; // 1-indexed
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  // Fallback to row 6 or row 1
  if (headerRowIndex === -1) {
    headerRowIndex = data.length >= 6 ? 6 : 1;
  }

  // Read header labels dynamically
  const headerValues = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  const colMap = {};

  for (let c = 0; c < headerValues.length; c++) {
    const raw = String(headerValues[c]).trim();
    if (!raw) continue;
    const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    colMap[clean] = c + 1; // 1-indexed column number
  }

  return { sheet, headerRowIndex, colMap, lastCol };
}

// Normalize key to find column index
function findCol(colMap, keywords) {
  for (let k = 0; k < keywords.length; k++) {
    const key = keywords[k].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (colMap[key]) return colMap[key];
  }
  return null;
}

// Upsert Single Ticket
function handleUpsertTicket(ticket, sheetName) {
  if (!ticket || !ticket.ticketNumber) {
    return jsonResponse({ success: false, error: "Missing ticket data" });
  }

  const ctx = getSheetContext(sheetName);
  const { sheet, headerRowIndex, colMap, lastCol } = ctx;

  const ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  const plannedCol = findCol(colMap, ["planned"]);
  const delayCol = findCol(colMap, ["delay"]);
  const actualCol = findCol(colMap, ["actual"]);

  const totalRows = sheet.getLastRow();
  let targetRow = -1;
  let firstEmptyRow = -1;

  // Scan Ticket column to find existing ticket or the first available empty row
  if (totalRows > headerRowIndex) {
    const ticketIds = sheet.getRange(headerRowIndex + 1, ticketCol, totalRows - headerRowIndex, 1).getValues();
    for (let i = 0; i < ticketIds.length; i++) {
      const val = String(ticketIds[i][0]).trim();
      if (val && val.toUpperCase() === String(ticket.ticketNumber).trim().toUpperCase()) {
        targetRow = headerRowIndex + 1 + i;
        break;
      }
      if (!val && firstEmptyRow === -1) {
        firstEmptyRow = headerRowIndex + 1 + i;
      }
    }
  }

  // If not found, use the first empty row below headers (Row 7, 8, 9...)
  const isNew = targetRow === -1;
  if (isNew) {
    if (firstEmptyRow !== -1) {
      targetRow = firstEmptyRow;
    } else {
      targetRow = totalRows < headerRowIndex ? headerRowIndex + 1 : totalRows + 1;
    }
  }

  // Map fields to columns
  const fieldMapping = {
    ticketNumber: ["ticket", "ticket#", "ticketno"],
    requestDate: ["requestdateist", "requestdate", "date"],
    company: ["company"],
    requester: ["requester"],
    applicationAndPage: ["applicationpage", "application", "app"],
    problemSummary: ["problemsummary", "problem", "description"],
    whatHasToBeChanged: ["whathastobechanged", "changed", "whattobechanged", "whatneedschanged", "change"],
    systemUrl: ["systempageurl", "systemurl", "url"],
    assignedTo: ["assignedto", "assignee"],
    reassign: ["reassign", "reassignedto"],
    helpdeskRef: ["helpdeskrefticket", "helpdeskref", "helpticket"],
    status: ["status"],
    overdueRemaining: ["overdueremaining", "overdue"],
    driveLink: ["drivelink", "drive", "attachment", "attachments", "filelink", "files", "imageurl", "screenshot", "attachmentlink"],
  };

  for (const field in fieldMapping) {
    const col = findCol(colMap, fieldMapping[field]);
    if (col && ticket[field] !== undefined) {
      sheet.getRange(targetRow, col).setValue(ticket[field]);
    }
  }

  // Handle "Actual" column (only write when completed, format MM/DD/YYYY HH:MM:SS)
  if (actualCol) {
    if (String(ticket.status).toLowerCase() === "completed" && ticket.actual) {
      sheet.getRange(targetRow, actualCol).setValue(ticket.actual);
    }
  }

  // NOTE: Planned and Delay columns are intentionally untouched!
  // Formula cells in Planned and Delay remain 100% intact.

  return jsonResponse({
    success: true,
    action: isNew ? "INSERTED" : "UPDATED",
    ticketNumber: ticket.ticketNumber,
    row: targetRow
  });
}

// Bulk Sync
function handleBulkSync(tickets, sheetName) {
  if (!tickets || !Array.isArray(tickets)) {
    return jsonResponse({ success: false, error: "Invalid tickets array" });
  }

  let count = 0;
  for (let i = 0; i < tickets.length; i++) {
    handleUpsertTicket(tickets[i], sheetName);
    count++;
  }

  return jsonResponse({ success: true, syncedCount: count });
}

// Delete Ticket from Sheet FMS
function handleDeleteTicket(ticketNumber, sheetName) {
  if (!ticketNumber) {
    return jsonResponse({ success: false, error: "Missing ticket number" });
  }

  const ctx = getSheetContext(sheetName);
  const { sheet, headerRowIndex, colMap } = ctx;
  const ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  const totalRows = sheet.getLastRow();

  if (totalRows <= headerRowIndex) {
    return jsonResponse({ success: false, error: "No data rows in sheet" });
  }

  const cleanTarget = String(ticketNumber).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const ticketIds = sheet.getRange(headerRowIndex + 1, ticketCol, totalRows - headerRowIndex, 1).getValues();

  for (let i = 0; i < ticketIds.length; i++) {
    const val = String(ticketIds[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (val === cleanTarget) {
      const rowToDelete = headerRowIndex + 1 + i;
      sheet.deleteRow(rowToDelete);
      return jsonResponse({ success: true, message: "Deleted row " + rowToDelete, ticketNumber: ticketNumber });
    }
  }

  return jsonResponse({ success: false, message: "Ticket not found in sheet: " + ticketNumber });
}

// Read Tickets from Sheet FMS
function handleGetTickets(sheetName) {
  const ctx = getSheetContext(sheetName);
  const { sheet, headerRowIndex, colMap } = ctx;
  const lastRow = sheet.getLastRow();

  if (lastRow <= headerRowIndex) {
    return jsonResponse({ success: true, tickets: [] });
  }

  const range = sheet.getRange(headerRowIndex + 1, 1, lastRow - headerRowIndex, ctx.lastCol);
  const values = range.getDisplayValues(); // getDisplayValues reads formatted formulas!
  const tickets = [];

  const ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  const reqDateCol = findCol(colMap, ["requestdateist", "requestdate", "date"]);
  const companyCol = findCol(colMap, ["company"]);
  const requesterCol = findCol(colMap, ["requester"]);
  const appCol = findCol(colMap, ["applicationpage", "application", "app"]);
  const problemCol = findCol(colMap, ["problemsummary", "problem", "description"]);
  const whatChangedCol = findCol(colMap, ["whathastobechanged", "changed", "whattobechanged", "whatneedschanged", "change"]);
  const urlCol = findCol(colMap, ["systempageurl", "systemurl", "url"]);
  const assignedCol = findCol(colMap, ["assignedto", "assignee"]);
  const reassignCol = findCol(colMap, ["reassign"]);
  const helpdeskCol = findCol(colMap, ["helpdeskrefticket", "helpdeskref"]);
  const statusCol = findCol(colMap, ["status"]);
  const overdueCol = findCol(colMap, ["overdueremaining", "overdue"]);
  const plannedCol = findCol(colMap, ["planned"]);
  const actualCol = findCol(colMap, ["actual"]);
  const delayCol = findCol(colMap, ["delay"]);
  const driveCol = findCol(colMap, ["drivelink", "drive", "attachment", "attachments", "filelink", "files", "imageurl", "screenshot", "attachmentlink"]);

  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const ticketNumber = ticketCol ? row[ticketCol - 1] : "";
    if (!ticketNumber || !String(ticketNumber).trim()) continue;

    tickets.push({
      ticketNumber: String(ticketNumber).trim(),
      requestDate: reqDateCol ? row[reqDateCol - 1] : "",
      company: companyCol ? row[companyCol - 1] : "",
      requesterName: requesterCol ? row[requesterCol - 1] : "",
      applicationName: appCol ? row[appCol - 1] : "",
      problemDescription: problemCol ? row[problemCol - 1] : "",
      whatHasToBeChanged: whatChangedCol ? row[whatChangedCol - 1] : "",
      systemUrl: urlCol ? row[urlCol - 1] : "",
      currentlyAssignedToName: assignedCol ? row[assignedCol - 1] : "",
      helpTicketNumber: helpdeskCol ? row[helpdeskCol - 1] : "",
      status: statusCol ? row[statusCol - 1] : "Pending",
      plannedDate: plannedCol ? row[plannedCol - 1] : "",
      actualDate: actualCol ? row[actualCol - 1] : "",
      delayInfo: delayCol ? row[delayCol - 1] : "",
      overdueText: overdueCol ? row[overdueCol - 1] : "",
      driveLink: driveCol ? row[driveCol - 1] : "",
    });
  }

  return jsonResponse({ success: true, tickets: tickets, count: tickets.length });
}

// Google Drive File Upload
function handleFileUpload(data) {
  const folder = DriveApp.getFolderById(data.folderId || TARGET_FOLDER_ID);
  const decoded = Utilities.base64Decode(data.base64Data);
  const blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName || "file_" + Date.now());
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  return jsonResponse({
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    downloadUrl: file.getDownloadUrl(),
    size: file.getSize()
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
  }
}

export const googleSheetsAdapter = new GoogleSheetsAdapter();
