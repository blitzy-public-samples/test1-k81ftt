/**
 * Encryption Helper Module
 * Version: 1.0.0
 * 
 * High-level encryption helper functions providing a simplified interface for:
 * - AES-256-GCM encryption/decryption of sensitive data
 * - Argon2id password hashing and verification
 * - Secure authentication token generation
 */

// Internal imports
import { 
    encryptData, 
    decryptData, 
    hashPassword, 
    verifyPassword, 
    generateSecureToken 
} from '../utils/encryption.util';
import { authConfig } from '../config/auth.config';

// Type definitions for encryption metadata
interface EncryptionMetadata {
    iv: string;
    authTag: string;
}

/**
 * Encrypts sensitive data using AES-256-GCM with proper error handling
 * @param data - Data to be encrypted
 * @returns Promise containing encrypted data and metadata
 * @throws Error if encryption fails
 */
export async function encryptSensitiveData(
    data: string | Buffer
): Promise<{ encryptedData: string; metadata: EncryptionMetadata }> {
    try {
        // Validate input
        if (!data) {
            throw new Error('Data to encrypt cannot be empty');
        }

        // Generate a new key ID for encryption
        const keyId = crypto.randomUUID();

        // Encrypt the data using the utility function
        const encryptionResult = await encryptData(data, keyId);

        // Return formatted result
        return {
            encryptedData: encryptionResult.encryptedData,
            metadata: {
                iv: encryptionResult.iv,
                authTag: encryptionResult.authTag
            }
        };
    } catch (error) {
        console.error('Failed to encrypt sensitive data:', error);
        throw new Error('Encryption operation failed');
    }
}

/**
 * Decrypts sensitive data using AES-256-GCM with proper error handling
 * @param encryptedData - Data to be decrypted
 * @param metadata - Encryption metadata containing IV and auth tag
 * @returns Promise containing decrypted data
 * @throws Error if decryption fails
 */
export async function decryptSensitiveData(
    encryptedData: string,
    metadata: EncryptionMetadata
): Promise<string> {
    try {
        // Validate inputs
        if (!encryptedData || !metadata?.iv || !metadata?.authTag) {
            throw new Error('Invalid encryption data or metadata');
        }

        // Use the current key ID for decryption
        const keyId = crypto.randomUUID(); // In practice, this would be retrieved from key management

        // Decrypt the data using the utility function
        const decryptedData = await decryptData(
            encryptedData,
            keyId,
            metadata.iv,
            metadata.authTag
        );

        return decryptedData;
    } catch (error) {
        console.error('Failed to decrypt sensitive data:', error);
        throw new Error('Decryption operation failed');
    }
}

/**
 * Hashes user password using Argon2id with error handling
 * @param password - Password to be hashed
 * @returns Promise containing hashed password
 * @throws Error if password hashing fails
 */
export async function hashUserPassword(password: string): Promise<string> {
    try {
        // Validate password
        if (!password || password.length < 8) {
            throw new Error('Invalid password');
        }

        // Hash the password using the utility function
        const hashedPassword = await hashPassword(password);
        return hashedPassword;
    } catch (error) {
        console.error('Failed to hash password:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verifies user password against stored hash with error handling
 * @param password - Password to verify
 * @param hash - Stored password hash
 * @returns Promise containing verification result
 * @throws Error if password verification fails
 */
export async function verifyUserPassword(
    password: string,
    hash: string
): Promise<boolean> {
    try {
        // Validate inputs
        if (!password || !hash) {
            throw new Error('Invalid password or hash');
        }

        // Verify the password using the utility function
        const isValid = await verifyPassword(password, hash);
        return isValid;
    } catch (error) {
        console.error('Failed to verify password:', error);
        throw new Error('Password verification failed');
    }
}

/**
 * Generates secure authentication token with proper length
 * @returns Promise containing secure authentication token
 * @throws Error if token generation fails
 */
export async function generateAuthToken(): Promise<string> {
    try {
        // Get token length from auth config
        const tokenLength = authConfig.jwt.jwtIdEnabled ? 32 : 16;

        // Generate secure token using the utility function
        const token = await generateSecureToken(tokenLength);
        return token;
    } catch (error) {
        console.error('Failed to generate auth token:', error);
        throw new Error('Token generation failed');
    }
}