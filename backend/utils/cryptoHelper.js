const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

/**
 * Derive encryption key using PBKDF2
 */
const deriveKey = (secret, salt) => {
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, "sha256");
};

/**
 * Encrypts cleartext using AES-256-GCM
 */
const encrypt = (text) => {
  if (!text) return "";
  const secret = process.env.JWT_SECRET || "default_super_secret_key_cubicnotes";
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: salt:iv:authTag:encryptedText
  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypts ciphertext using AES-256-GCM
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) return "";
    
    const salt = Buffer.from(parts[0], "hex");
    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const encrypted = parts[3];
    
    const secret = process.env.JWT_SECRET || "default_super_secret_key_cubicnotes";
    const key = deriveKey(secret, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return "";
  }
};

module.exports = { encrypt, decrypt };
