import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  Max, 
  IsUUID, 
  Matches,
  IsHash
} from 'class-validator'; // v0.14.0
import { IFile, AllowedFileTypes } from '../interfaces/IFile';

/**
 * Maximum file size constant (25MB) as per system requirements
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

/**
 * Regular expression for validating allowed file extensions
 * Supports: PDF, DOC, DOCX, JPG/JPEG, PNG
 */
const ALLOWED_FILE_EXTENSIONS = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;

/**
 * Data Transfer Object for file creation requests
 * Implements comprehensive validation based on system requirements and security controls
 */
export class CreateFileDto implements Pick<IFile, 'name' | 'originalName' | 'mimeType' | 'size' | 'hash'> {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/, {
    message: 'File name must contain only alphanumeric characters, hyphens, and underscores'
  })
  @Matches(ALLOWED_FILE_EXTENSIONS, {
    message: 'File type not allowed. Supported types: PDF, DOC, DOCX, JPG, PNG'
  })
  name: string;

  @IsString()
  @Matches(ALLOWED_FILE_EXTENSIONS, {
    message: 'Original file type not allowed. Supported types: PDF, DOC, DOCX, JPG, PNG'
  })
  originalName: string;

  @IsString()
  @IsEnum(AllowedFileTypes, {
    message: 'Invalid MIME type. Supported types: PDF, DOC, DOCX, JPG, PNG'
  })
  mimeType: string;

  @IsNumber()
  @Max(MAX_FILE_SIZE, {
    message: 'File size exceeds maximum allowed size of 25MB'
  })
  size: number;

  @IsUUID('4')
  taskId: string;

  @IsUUID('4')
  projectId: string;

  @IsString()
  @IsHash('sha256', {
    message: 'File hash must be a valid SHA-256 hash'
  })
  hash: string;
}

/**
 * Data Transfer Object for file update requests
 * Supports partial updates with optional fields and maintains security validations
 */
export class UpdateFileDto implements Partial<Pick<IFile, 'name' | 'taskId' | 'projectId'>> {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/, {
    message: 'File name must contain only alphanumeric characters, hyphens, and underscores'
  })
  @Matches(ALLOWED_FILE_EXTENSIONS, {
    message: 'File type not allowed. Supported types: PDF, DOC, DOCX, JPG, PNG'
  })
  name?: string;

  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}