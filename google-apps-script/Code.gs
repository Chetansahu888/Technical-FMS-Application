/**
 * =========================================================================
 * Technical Help FMS - Google Sheet & Google Drive Unified Backend
 * Sheet Name: FMS
 * Master Users Sheet Name: Master
 * Target Drive Folder ID: 1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5
 * 
 * FEATURES:
 * - Dynamic column header detection (auto reads row 6 or any header row in FMS)
 * - Reads all 300+ users & credentials from "Master" sheet tab (including IMPORTRANGE)
 * - Never overwrites "Planned" and "Delay" columns (Formulas are 100% safe!)
 * - Writes "Actual" completion date in MM/DD/YYYY HH:MM:SS format
 * - Bi-directional sync: React <-> Google Sheet
 * - High-speed base64 file upload directly into Google Drive folder
 * =========================================================================
 */

var TARGET_FOLDER_ID = "1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5";
var SHEET_NAME = "FMS";
var MASTER_SHEET_NAME = "Master";

// --- HTTP POST HANDLER ---
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request payload" });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;

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

    // 5. Read Users from Master Sheet
    if (action === "GET_USERS") {
      return handleGetUsers(data.sheetName || MASTER_SHEET_NAME);
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// --- HTTP GET HANDLER (Read Tickets & Users from Sheet) ---
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "GET_TICKETS";
    var sheetName = (e && e.parameter && e.parameter.sheetName) || SHEET_NAME;

    if (action === "GET_TICKETS") {
      return handleGetTickets(sheetName);
    }

    if (action === "GET_USERS") {
      return handleGetUsers(sheetName || MASTER_SHEET_NAME);
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }

  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var scanRows = Math.min(lastRow, 15);
  var data = sheet.getRange(1, 1, scanRows, lastCol).getValues();

  var headerRowIndex = -1;
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      var val = String(data[r][c]).toLowerCase();
      if (val.includes("ticket")) {
        headerRowIndex = r + 1; // 1-indexed
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  if (headerRowIndex === -1) {
    headerRowIndex = data.length >= 6 ? 6 : 1;
  }

  var headerValues = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  var colMap = {};

  for (var c = 0; c < headerValues.length; c++) {
    var raw = String(headerValues[c]).trim();
    if (!raw) continue;
    var clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    colMap[clean] = c + 1;
  }

  return { sheet: sheet, headerRowIndex: headerRowIndex, colMap: colMap, lastCol: lastCol };
}

function findCol(colMap, keywords) {
  for (var k = 0; k < keywords.length; k++) {
    var key = keywords[k].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (colMap[key]) return colMap[key];
  }
  return null;
}

// Upsert Single Ticket
function handleUpsertTicket(ticket, sheetName) {
  if (!ticket || !ticket.ticketNumber) {
    return jsonResponse({ success: false, error: "Missing ticket data" });
  }

  var ctx = getSheetContext(sheetName);
  var sheet = ctx.sheet;
  var headerRowIndex = ctx.headerRowIndex;
  var colMap = ctx.colMap;

  var ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  var actualCol = findCol(colMap, ["actual"]);

  var totalRows = sheet.getLastRow();
  var targetRow = -1;
  var firstEmptyRow = -1;

  if (totalRows > headerRowIndex) {
    var ticketIds = sheet.getRange(headerRowIndex + 1, ticketCol, totalRows - headerRowIndex, 1).getValues();
    for (var i = 0; i < ticketIds.length; i++) {
      var val = String(ticketIds[i][0]).trim();
      if (val && val.toUpperCase() === String(ticket.ticketNumber).trim().toUpperCase()) {
        targetRow = headerRowIndex + 1 + i;
        break;
      }
      if (!val && firstEmptyRow === -1) {
        firstEmptyRow = headerRowIndex + 1 + i;
      }
    }
  }

  var isNew = targetRow === -1;
  if (isNew) {
    if (firstEmptyRow !== -1) {
      targetRow = firstEmptyRow;
    } else {
      targetRow = totalRows < headerRowIndex ? headerRowIndex + 1 : totalRows + 1;
    }
  }

  var fieldMapping = {
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

  for (var field in fieldMapping) {
    var col = findCol(colMap, fieldMapping[field]);
    if (col && ticket[field] !== undefined) {
      sheet.getRange(targetRow, col).setValue(ticket[field]);
    }
  }

  if (actualCol) {
    if (String(ticket.status).toLowerCase() === "completed" && ticket.actual) {
      sheet.getRange(targetRow, actualCol).setValue(ticket.actual);
    }
  }

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

  var count = 0;
  for (var i = 0; i < tickets.length; i++) {
    handleUpsertTicket(tickets[i], sheetName);
    count++;
  }

  return jsonResponse({ success: true, syncedCount: count });
}

// Delete Ticket
function handleDeleteTicket(ticketNumber, sheetName) {
  if (!ticketNumber) {
    return jsonResponse({ success: false, error: "Missing ticket number" });
  }

  var ctx = getSheetContext(sheetName);
  var sheet = ctx.sheet;
  var headerRowIndex = ctx.headerRowIndex;
  var colMap = ctx.colMap;
  var ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  var totalRows = sheet.getLastRow();

  if (totalRows <= headerRowIndex) {
    return jsonResponse({ success: false, error: "No data rows in sheet" });
  }

  var cleanTarget = String(ticketNumber).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  var ticketIds = sheet.getRange(headerRowIndex + 1, ticketCol, totalRows - headerRowIndex, 1).getValues();

  for (var i = 0; i < ticketIds.length; i++) {
    var val = String(ticketIds[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (val === cleanTarget) {
      var rowToDelete = headerRowIndex + 1 + i;
      sheet.deleteRow(rowToDelete);
      return jsonResponse({ success: true, message: "Deleted row " + rowToDelete, ticketNumber: ticketNumber });
    }
  }

  return jsonResponse({ success: false, message: "Ticket not found in sheet: " + ticketNumber });
}

// Read Tickets from Sheet FMS
function handleGetTickets(sheetName) {
  var ctx = getSheetContext(sheetName);
  var sheet = ctx.sheet;
  var headerRowIndex = ctx.headerRowIndex;
  var colMap = ctx.colMap;
  var lastRow = sheet.getLastRow();

  if (lastRow <= headerRowIndex) {
    return jsonResponse({ success: true, tickets: [] });
  }

  var range = sheet.getRange(headerRowIndex + 1, 1, lastRow - headerRowIndex, ctx.lastCol);
  var values = range.getDisplayValues();
  var tickets = [];

  var ticketCol = findCol(colMap, ["ticket", "ticket#", "ticketno"]) || 1;
  var reqDateCol = findCol(colMap, ["requestdateist", "requestdate", "date"]);
  var companyCol = findCol(colMap, ["company"]);
  var requesterCol = findCol(colMap, ["requester"]);
  var appCol = findCol(colMap, ["applicationpage", "application", "app"]);
  var problemCol = findCol(colMap, ["problemsummary", "problem", "description"]);
  var whatChangedCol = findCol(colMap, ["whathastobechanged", "changed", "whattobechanged", "whatneedschanged", "change"]);
  var urlCol = findCol(colMap, ["systempageurl", "systemurl", "url"]);
  var assignedCol = findCol(colMap, ["assignedto", "assignee"]);
  var helpdeskCol = findCol(colMap, ["helpdeskrefticket", "helpdeskref"]);
  var statusCol = findCol(colMap, ["status"]);
  var overdueCol = findCol(colMap, ["overdueremaining", "overdue"]);
  var plannedCol = findCol(colMap, ["planned"]);
  var actualCol = findCol(colMap, ["actual"]);
  var delayCol = findCol(colMap, ["delay"]);
  var driveCol = findCol(colMap, ["drivelink", "drive", "attachment", "attachments", "filelink", "files", "imageurl", "screenshot", "attachmentlink"]);

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var ticketNumber = ticketCol ? row[ticketCol - 1] : "";
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

// Read all 300+ Users from "Master" Sheet (including dynamic IMPORTRANGE)
function handleGetUsers(masterSheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(masterSheetName || "Master");
  if (!sheet) {
    sheet = ss.getSheetByName("master") || ss.getSheetByName("Users");
  }
  if (!sheet) {
    return jsonResponse({ success: false, error: "Master sheet tab not found" });
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return jsonResponse({ success: true, users: [] });
  }

  var headerRow = values[0];
  var userCol = 0;
  var passCol = 1;
  var roleCol = 2;
  var compCol = 3;

  for (var c = 0; c < headerRow.length; c++) {
    var h = String(headerRow[c]).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h.includes("user") || h.includes("name")) userCol = c;
    if (h.includes("pass")) passCol = c;
    if (h.includes("role")) roleCol = c;
    if (h.includes("comp")) compCol = c;
  }

  var users = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var username = String(row[userCol] || "").trim();
    if (!username) continue; // Skip blank rows

    var password = String(row[passCol] || "").trim();
    var rawRole = String(row[roleCol] || "").trim();
    var company = String(row[compCol] || "").trim() || "PMMPL";

    var role = "employee";
    var rLower = rawRole.toLowerCase();
    if (rLower.includes("admin")) {
      role = "admin";
    } else if (rLower.includes("it") || rLower.includes("specialist") || rLower.includes("staff")) {
      role = "it_person";
    }

    users.push({
      username: username,
      password: password,
      role: role,
      company: company
    });
  }

  return jsonResponse({ success: true, users: users, count: users.length });
}

// Google Drive File Upload
function handleFileUpload(data) {
  var folder = DriveApp.getFolderById(data.folderId || TARGET_FOLDER_ID);
  var decoded = Utilities.base64Decode(data.base64Data);
  var blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName || "file_" + Date.now());
  var file = folder.createFile(blob);

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
