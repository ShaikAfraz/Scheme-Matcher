import fs from "fs";
import path from "path";
import crypto from "crypto";

// Private storage directory (NEVER served as public static assets)
const STORAGE_ROOT = path.resolve(process.cwd(), "storage/documents");
const MAX_FILE_SIZE = parseInt(process.env.SCHEME_MATCHER_MAX_DOC_SIZE || (10 * 1024 * 1024).toString(), 10); // 10MB default

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true, mode: 0o700 });
}

// Magic bytes for supported mime types
const MAGIC_SIGNATURES = {
  pdf: {
    mime: "application/pdf",
    ext: "pdf",
    check: (buf) => buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46, // %PDF
  },
  jpg: {
    mime: "image/jpeg",
    ext: "jpg",
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  png: {
    mime: "image/png",
    ext: "png",
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
};

/**
 * Validate file payload: extension, size, magic signature, and safe filename.
 */
export function validateUploadPayload({ filename, buffer, reportedMimeType }) {
  if (!buffer || !(buffer instanceof Buffer)) {
    throw new Error("Invalid file content: Empty or non-buffer data.");
  }

  if (buffer.length === 0) {
    throw new Error("Cannot upload empty file (0 bytes).");
  }

  if (buffer.length > MAX_FILE_SIZE) {
    const maxMb = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    throw new Error(`File size ${(buffer.length / (1024 * 1024)).toFixed(2)} MB exceeds statutory limit of ${maxMb} MB.`);
  }

  const safeFilename = path.basename(filename || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeFilename.split(".").pop().toLowerCase();

  let matchedType = null;
  if (ext === "pdf" && MAGIC_SIGNATURES.pdf.check(buffer)) {
    matchedType = MAGIC_SIGNATURES.pdf;
  } else if ((ext === "jpg" || ext === "jpeg") && MAGIC_SIGNATURES.jpg.check(buffer)) {
    matchedType = MAGIC_SIGNATURES.jpg;
  } else if (ext === "png" && MAGIC_SIGNATURES.png.check(buffer)) {
    matchedType = MAGIC_SIGNATURES.png;
  }

  if (!matchedType) {
    throw new Error(
      `Unsupported or malformed file type (.${ext}). Only genuine PDF, JPG, and PNG documents with valid cryptographic headers are accepted.`
    );
  }

  // SHA-256 hash for deduplication and integrity check
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    safeFilename,
    ext: matchedType.ext,
    mimeType: matchedType.mime,
    sizeBytes: buffer.length,
    fileHash,
  };
}

/**
 * Persist document buffer securely in private object storage.
 * Files are isolated in per-user subdirectories and named by random document ID.
 */
export function storeDocumentFile({ userId, docId, buffer, ext }) {
  if (!userId || !docId) {
    throw new Error("User ID and Document ID are required for private storage.");
  }

  // Reject path traversal attempts explicitly
  if (
    userId.includes("..") ||
    userId.includes("/") ||
    userId.includes("\\") ||
    docId.includes("..") ||
    docId.includes("/") ||
    docId.includes("\\")
  ) {
    throw new Error("Path traversal violation detected in document storage parameters.");
  }

  // Sanitize path components to prevent path traversal
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");


  const userDir = path.join(STORAGE_ROOT, safeUserId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true, mode: 0o700 });
  }

  const targetPath = path.join(userDir, `${safeDocId}.${safeExt}`);
  const resolved = path.resolve(targetPath);

  // Strict path jail check
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Path traversal violation detected in private storage.");
  }

  fs.writeFileSync(resolved, buffer, { mode: 0o600 });
  return resolved;
}

/**
 * Retrieve document buffer from private storage.
 */
export function readDocumentFile(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Security violation: Attempted access outside private storage root.");
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return fs.readFileSync(resolved);
}

/**
 * Securely delete document from disk.
 */
export function deleteDocumentFile(filePath) {
  if (!filePath) return false;
  try {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(STORAGE_ROOT)) {
      return false;
    }
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Storage] Failed to delete file:", err.message);
    return false;
  }
}

export { STORAGE_ROOT, MAX_FILE_SIZE };
