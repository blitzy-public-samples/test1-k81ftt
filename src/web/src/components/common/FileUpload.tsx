/**
 * @fileoverview Enterprise-grade secure file upload component with comprehensive validation and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useRef, useState } from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import { Button, ButtonProps } from './Button';
import { LoadingState } from '../../types/common.types';

// Interfaces
export interface FileUploadProps {
  multiple?: boolean;
  accept?: string[];
  maxSize?: number;
  minSize?: number;
  disabled?: boolean;
  encrypt?: boolean;
  chunkSize?: number;
  timeout?: number;
  onFileSelect: (files: File[]) => void;
  onProgress?: (progress: number, file: File) => void;
  onError?: (error: FileUploadError) => void;
  onCancel?: () => void;
  className?: string;
  uploadText?: string;
  dragDropText?: string;
  aria?: FileUploadAriaLabels;
}

export interface FileUploadError {
  code: string;
  message: string;
  file: File;
  details?: any;
}

export interface FileUploadAriaLabels {
  dropzone: string;
  input: string;
  button: string;
  progress: string;
  error: string;
}

/**
 * Enterprise-grade file upload component with security and accessibility features
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  multiple = false,
  accept = ['application/octet-stream'],
  maxSize = 25 * 1024 * 1024, // 25MB
  minSize = 0,
  disabled = false,
  encrypt = true,
  chunkSize = 1024 * 1024, // 1MB chunks
  timeout = 300000, // 5 minutes
  onFileSelect,
  onProgress,
  onError,
  onCancel,
  className,
  uploadText = 'Choose File',
  dragDropText = 'or drag and drop files here',
  aria = {
    dropzone: 'File upload dropzone',
    input: 'File upload input',
    button: 'Choose file button',
    progress: 'Upload progress',
    error: 'Upload error message'
  }
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<LoadingState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<FileUploadError | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const cancelTokenRef = useRef<boolean>(false);

  /**
   * Validates file security and constraints
   */
  const validateFiles = useCallback((files: File[]): { validFiles: File[], errors: FileUploadError[] } => {
    const validFiles: File[] = [];
    const errors: FileUploadError[] = [];

    for (const file of files) {
      // Validate file type
      if (!accept.includes(file.type)) {
        errors.push({
          code: 'INVALID_TYPE',
          message: `File type ${file.type} is not allowed`,
          file
        });
        continue;
      }

      // Validate file size
      if (file.size < minSize || file.size > maxSize) {
        errors.push({
          code: 'INVALID_SIZE',
          message: `File size must be between ${minSize} and ${maxSize} bytes`,
          file
        });
        continue;
      }

      // Validate file name for security
      const sanitizedName = file.name.replace(/[^\w\s.-]/g, '');
      if (sanitizedName !== file.name) {
        errors.push({
          code: 'INVALID_NAME',
          message: 'File name contains invalid characters',
          file
        });
        continue;
      }

      validFiles.push(file);
    }

    return { validFiles, errors };
  }, [accept, maxSize, minSize]);

  /**
   * Handles file encryption if enabled
   */
  const encryptFile = async (file: File): Promise<File> => {
    if (!encrypt) return file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const encrypted = CryptoJS.AES.encrypt(
            event.target?.result as string,
            process.env.REACT_APP_FILE_ENCRYPTION_KEY || 'default-key'
          );
          
          const encryptedBlob = new Blob([encrypted.toString()], { type: file.type });
          const encryptedFile = new File([encryptedBlob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });
          
          resolve(encryptedFile);
        } catch (err) {
          reject(new Error('File encryption failed'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handles drag over events with accessibility
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!disabled && !dragOver) {
      setDragOver(true);
      // Update ARIA live region
      const liveRegion = document.getElementById('file-upload-live-region');
      if (liveRegion) {
        liveRegion.textContent = 'File hover detected. Release to upload.';
      }
    }
  }, [disabled, dragOver]);

  /**
   * Handles secure file drop with validation
   */
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);

    if (disabled || uploadState === 'loading') return;

    const droppedFiles = Array.from(event.dataTransfer.files);
    const { validFiles, errors } = validateFiles(droppedFiles);

    // Handle validation errors
    if (errors.length > 0) {
      errors.forEach(error => onError?.(error));
      setError(errors[0]);
      return;
    }

    try {
      setUploadState('loading');
      const encryptedFiles = await Promise.all(validFiles.map(encryptFile));
      onFileSelect(encryptedFiles);
      setError(null);
    } catch (err) {
      const error: FileUploadError = {
        code: 'ENCRYPTION_FAILED',
        message: 'Failed to process files securely',
        file: validFiles[0]
      };
      onError?.(error);
      setError(error);
    } finally {
      setUploadState('idle');
    }
  }, [disabled, uploadState, validateFiles, encryptFile, onFileSelect, onError]);

  /**
   * Handles file input change
   */
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const selectedFiles = Array.from(event.target.files);
    const { validFiles, errors } = validateFiles(selectedFiles);

    if (errors.length > 0) {
      errors.forEach(error => onError?.(error));
      setError(errors[0]);
      return;
    }

    try {
      setUploadState('loading');
      const encryptedFiles = await Promise.all(validFiles.map(encryptFile));
      onFileSelect(encryptedFiles);
      setError(null);
      
      // Reset input for security
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const error: FileUploadError = {
        code: 'PROCESSING_FAILED',
        message: 'Failed to process files',
        file: validFiles[0]
      };
      onError?.(error);
      setError(error);
    } finally {
      setUploadState('idle');
    }
  }, [validateFiles, encryptFile, onFileSelect, onError]);

  /**
   * Handles upload cancellation
   */
  const handleCancel = useCallback(() => {
    cancelTokenRef.current = true;
    setUploadState('idle');
    setProgress(0);
    onCancel?.();
  }, [onCancel]);

  // Component classes
  const containerClasses = classNames(
    'file-upload',
    {
      'file-upload--drag-over': dragOver,
      'file-upload--disabled': disabled,
      'file-upload--error': error,
      'file-upload--loading': uploadState === 'loading'
    },
    className
  );

  return (
    <div
      ref={dropzoneRef}
      className={containerClasses}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      aria-label={aria.dropzone}
      role="region"
      aria-disabled={disabled}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept.join(',')}
        onChange={handleFileChange}
        disabled={disabled || uploadState === 'loading'}
        aria-label={aria.input}
        className="file-upload__input"
      />

      <Button
        variant="outlined"
        disabled={disabled || uploadState === 'loading'}
        onClick={() => fileInputRef.current?.click()}
        aria-label={aria.button}
      >
        {uploadText}
      </Button>

      <p className="file-upload__text">{dragDropText}</p>

      {uploadState === 'loading' && (
        <div
          className="file-upload__progress"
          role="progressbar"
          aria-label={aria.progress}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="file-upload__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div
          className="file-upload__error"
          role="alert"
          aria-label={aria.error}
        >
          {error.message}
        </div>
      )}

      {/* Hidden live region for screen reader announcements */}
      <div
        id="file-upload-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
};

export default FileUpload;