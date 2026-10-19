import { Attachment } from '../types';
import { masterDataService } from './masterDataService';

export const DEFAULT_DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/u/0/folders/${DEFAULT_DRIVE_FOLDER_ID}`;

export interface UploadResult {
  attachment: Attachment;
  uploadedToDrive: boolean;
  message?: string;
}

class GoogleDriveService {
  /**
   * Get active Google Drive folder ID
   */
  getFolderId(): string {
    const settings = masterDataService.getSettings();
    return settings.googleDriveFolderId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID;
  }

  /**
   * Get direct folder link to Google Drive
   */
  getFolderUrl(): string {
    const folderId = this.getFolderId();
    return `https://drive.google.com/drive/u/0/folders/${folderId}`;
  }

  /**
   * Get configured Google Apps Script Web App URL
   */
  getAppsScriptUrl(): string {
    const settings = masterDataService.getSettings();
    return settings.googleAppsScriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';
  }

  /**
   * Check if live Google Drive sync via Apps Script is configured
   */
  isConfigured(): boolean {
    const url = this.getAppsScriptUrl();
    return Boolean(url && url.trim().startsWith('http'));
  }

  /**
   * Helper to convert a browser File into base64 string
   */
  private readFileAsBase64(file: File): Promise<{ base64Data: string; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip data:mime/type;base64, prefix for Apps Script decoding
        const base64Data = dataUrl.split(',')[1] || '';
        resolve({ base64Data, dataUrl });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads an image or PDF to Google Drive folder: 1n2dmSwLJgysDLNo1aoqXP8rURMI6a5U5
   * via Google Apps Script Web App.
   * If Apps Script Web App is not configured, saves safely as data URL with notification.
   */
  async uploadFile(file: File): Promise<UploadResult> {
    const folderId = this.getFolderId();
    const scriptUrl = this.getAppsScriptUrl();
    const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const { base64Data, dataUrl } = await this.readFileAsBase64(file);

    // If Google Apps Script Web App endpoint is configured, upload directly to Google Drive
    if (scriptUrl) {
      try {
        const payload = {
          action: 'UPLOAD_FILE',
          folderId: folderId,
          fileName: file.name,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          base64Data: base64Data,
        };

        // Note: text/plain avoids CORS preflight OPTIONS request in Apps Script Web Apps
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result && result.success && result.fileUrl) {
          const driveAttachment: Attachment = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
            url: result.fileUrl, // Direct Google Drive view URL
            uploadedAt: new Date().toISOString(),
            driveFileId: result.fileId,
            isDriveUpload: true,
          };

          return {
            attachment: driveAttachment,
            uploadedToDrive: true,
            message: `Uploaded directly to Google Drive (${file.name})`,
          };
        } else {
          throw new Error(result?.error || 'Apps script returned unsuccessful status');
        }
      } catch (err: unknown) {
        console.warn('Direct Google Drive upload failed, falling back to local storage:', err);
        // Fallback to local data URL so user doesn't lose ticket data
        const localAttachment: Attachment = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          url: dataUrl,
          uploadedAt: new Date().toISOString(),
          isDriveUpload: false,
        };

        return {
          attachment: localAttachment,
          uploadedToDrive: false,
          message: `Drive upload error: ${(err as Error).message}. Stored in local session.`,
        };
      }
    }

    // Demo / unconfigured mode: Store locally as dataUrl
    const fallbackAttachment: Attachment = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
      url: dataUrl,
      uploadedAt: new Date().toISOString(),
      isDriveUpload: false,
    };

    return {
      attachment: fallbackAttachment,
      uploadedToDrive: false,
      message: 'Saved locally. Connect Apps Script Web App URL to upload directly to Drive.',
    };
  }

  /**
   * Generates complete, ready-to-paste Google Apps Script code
   */
  getAppsScriptCode(): string {
    const folderId = this.getFolderId();
    return `/**
 * Google Apps Script - Technical Help FMS Drive Uploader & Backend
 * Target Google Drive Folder ID: ${folderId}
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open https://script.google.com and click "New project"
 * 2. Paste this entire code into Code.gs
 * 3. Click "Deploy" -> "New deployment"
 * 4. Click gear icon next to "Select type" and pick "Web app"
 * 5. Set:
 *    - Description: "Technical Help FMS Drive Upload API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", authorize permissions, and copy the Web App URL (ends with /exec).
 * 7. Paste that Web App URL in Technical Help FMS -> Master Settings -> Google Drive Integration!
 */

const TARGET_FOLDER_ID = "${folderId}";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty POST body received" });
    }

    const data = JSON.parse(e.postData.contents);

    // Action 1: Upload File to Google Drive
    if (data.action === "UPLOAD_FILE") {
      const folderId = data.folderId || TARGET_FOLDER_ID;
      const folder = DriveApp.getFolderById(folderId);

      // Decode base64 to binary blob
      const decodedBytes = Utilities.base64Decode(data.base64Data);
      const blob = Utilities.newBlob(
        decodedBytes,
        data.mimeType || "application/octet-stream",
        data.fileName || "attachment_" + new Date().getTime()
      );

      // Create file in folder
      const file = folder.createFile(blob);

      // Set permission so authorized viewers or team can view the attachment
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        // Domain restricted or policy permission
      }

      return jsonResponse({
        success: true,
        fileId: file.getId(),
        fileName: file.getName(),
        fileUrl: file.getUrl(),
        downloadUrl: file.getDownloadUrl(),
        size: file.getSize(),
        mimeType: file.getMimeType()
      });
    }

    return jsonResponse({ success: false, error: "Invalid action specified: " + data.action });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function doGet(e) {
  return jsonResponse({
    status: "online",
    message: "Technical Help FMS Google Drive Uploader is active",
    targetFolderId: TARGET_FOLDER_ID
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
  }
}

export const googleDriveService = new GoogleDriveService();
