export type UserRole = 'employee' | 'it_person' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  company: string;
  avatar?: string;
  active: boolean;
}

export type TicketStatus = 'Pending' | 'In Progress' | 'Hold' | 'Completed';

export type TicketCategory = 'Sheet/FMS' | 'Form' | 'App' | 'Website' | 'Others';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Google Drive url, base64 data url, or object url
  uploadedAt: string;
  driveFileId?: string;
  isDriveUpload?: boolean;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  timestamp: string; // ISO string
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'Created' | 'Assigned' | 'Started' | 'Put on Hold' | 'Resumed' | 'Reassigned' | 'Completed';
  remarks?: string;
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
}

export interface Ticket {
  id: string; // Permanent internal ID, e.g., "tkt_1729312000_1"
  ticketNumber: string; // Display number, e.g., "TKT-2026-0001"
  requestDate: string; // ISO string: e.g. "2026-10-18T10:30:00.000Z"
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
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
  
  // Assignment fields
  originallyAssignedToId: string;
  originallyAssignedToName: string;
  currentlyAssignedToId: string;
  currentlyAssignedToName: string;
  resolvedById?: string;
  resolvedByName?: string;

  // Status & timestamps
  status: TicketStatus;
  plannedDate: string; // ISO string
  actualDate?: string; // ISO string
  holdReason?: string;
  solutionRemarks?: string;
  
  // Activity log
  activityLog: TicketActivity[];
}

export interface MasterSettings {
  companies: string[];
  categories: TicketCategory[];
  workingDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday. Default [1,2,3,4,5,6] (Sunday off)
  slaWorkingDays: number; // Default 1
  autoAssignRoundRobinIndex: number;
  googleDriveFolderId?: string;
  googleAppsScriptUrl?: string;
}
