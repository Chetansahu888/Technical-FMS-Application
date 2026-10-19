import React, { useState } from 'react';
import { Attachment } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  ExternalLink,
  CloudCheck,
  Loader2,
} from 'lucide-react';

interface AttachmentViewerProps {
  attachments: Attachment[];
  onUpload?: (attachments: Attachment[]) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  onUpload,
  onRemove,
  readOnly = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !onUpload) return;
    const files = Array.from(e.target.files);

    setIsUploading(true);
    setUploadStatus(`Uploading ${files.length} file(s) to Google Drive...`);

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size (limit 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 25MB limit.`);
        continue;
      }

      setUploadStatus(`Uploading (${i + 1}/${files.length}): ${file.name}...`);

      try {
        const uploadResult = await googleDriveService.uploadFile(file);
        newAttachments.push(uploadResult.attachment);
      } catch (err) {
        console.error('File upload error:', err);
      }
    }

    if (newAttachments.length > 0) {
      onUpload([...attachments, ...newAttachments]);
    }

    setIsUploading(false);
    setUploadStatus('');
    e.target.value = '';
  };

  return (
    <div className="attachments-wrapper">
      {!readOnly && (
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="file-upload-input"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              border: isUploading ? '2px dashed var(--primary)' : '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              background: isUploading ? '#EFF6FF' : '#F8FAFC',
              cursor: isUploading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isUploading ? (
              <>
                <Loader2 size={24} style={{ color: 'var(--primary)', marginBottom: '6px', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                  {uploadStatus || 'Uploading to Google Drive...'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Please wait while the file is processed...
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={24} style={{ color: 'var(--primary)', marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Click to upload Image or PDF
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  PNG, JPG, WEBP or PDF (Uploads to Google Drive folder)
                </div>
              </>
            )}
          </label>
          <input
            id="file-upload-input"
            type="file"
            multiple
            disabled={isUploading}
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {attachments.length === 0 ? (
        readOnly ? (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No attachments provided with this ticket.
          </div>
        ) : null
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '10px',
          }}
        >
          {attachments.map(att => {
            const isImage = att.type.startsWith('image/');
            const isDriveLink = att.isDriveUpload || att.url.includes('drive.google.com');

            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isImage ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <FileText size={20} color="#DC2626" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={att.name}
                  >
                    {att.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>{formatSize(att.size)}</span>
                    {isDriveLink && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#047857',
                          background: '#D1FAE5',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <CloudCheck size={10} />
                        Drive
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '4px',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Open file in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                  {!readOnly && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(att.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Remove attachment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
