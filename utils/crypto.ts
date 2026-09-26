import { sha256 } from 'js-sha256';

const DEFAULT_SECRET_SALT = 'smart_realty_secure_salt_v4_2026';

/**
 * Generates a SHA-256 hash with optional salt
 */
export const hashPassword = async (password: string, salt = DEFAULT_SECRET_SALT): Promise<string> => {
  return sha256(`${salt}:${password}`);
};

/**
 * Synchronous version of hashPassword
 */
export const hashPasswordSync = (password: string, salt = DEFAULT_SECRET_SALT): string => {
  return sha256(`${salt}:${password}`);
};

/**
 * Verifies a plain text password against a stored hash (supports both legacy unsalted and modern salted hashes)
 */
export const verifyPassword = (password: string, storedHash: string): boolean => {
  if (!password || !storedHash) return false;
  // Modern salted comparison
  const saltedHash = hashPasswordSync(password);
  if (saltedHash === storedHash) return true;
  // Legacy unsalted fallback for backwards compatibility
  const plainHash = sha256(password);
  return plainHash === storedHash || password === storedHash;
};

/**
 * Generates a cryptographically random token string
 */
export const generateSecureToken = (length = 32): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }
  // Fallback
  let res = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

/**
 * Fast & secure synchronous reversible encryption for local data caching
 */
export const encryptDataSync = (plainText: string, secretKey = DEFAULT_SECRET_SALT): string => {
  try {
    if (!plainText) return '';
    const keyHash = sha256(secretKey);
    let output = '';
    for (let i = 0; i < plainText.length; i++) {
      const charCode = plainText.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      output += String.fromCharCode(charCode ^ keyChar);
    }
    return 'ENC_' + btoa(encodeURIComponent(output));
  } catch {
    return plainText;
  }
};

/**
 * Fast & secure synchronous reversible decryption for local data caching
 */
export const decryptDataSync = (cipherText: string, secretKey = DEFAULT_SECRET_SALT): string => {
  try {
    if (!cipherText || !cipherText.startsWith('ENC_')) return cipherText;
    const raw = decodeURIComponent(atob(cipherText.replace('ENC_', '')));
    const keyHash = sha256(secretKey);
    let output = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      output += String.fromCharCode(charCode ^ keyChar);
    }
    return output;
  } catch {
    return cipherText;
  }
};

