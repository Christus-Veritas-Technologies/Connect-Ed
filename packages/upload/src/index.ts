import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// ─── Configuration ───────────────────────────────────────────

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string; // Optional custom domain or public bucket URL
}

let s3Client: S3Client | null = null;
let bucketName: string = "";
let publicUrl: string | null = null;

/**
 * Initialize the R2/S3 client. Call this once at server startup.
 */
export function initR2(config: R2Config): void {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  bucketName = config.bucketName;
  publicUrl = config.publicUrl || null;
}

/**
 * Get the initialized S3 client (throws if not initialized).
 */
function getClient(): S3Client {
  if (!s3Client) {
    throw new Error(
      "R2 client not initialized. Call initR2() at server startup."
    );
  }
  return s3Client;
}

// ─── Upload ──────────────────────────────────────────────────

export interface UploadResult {
  storedName: string; // UUID key in the bucket
  url: string | null; // Public URL if available
  size: number;
  mimeType: string;
}

/**
 * Upload a file buffer to R2.
 *
 * @param buffer  - The raw file bytes
 * @param originalName - Original filename (used to derive content-type fallback)
 * @param mimeType - MIME type of the file
 * @param folder - Optional folder prefix (e.g. "schools/abc123")
 */
export async function uploadFile(
  buffer: Buffer | Uint8Array,
  originalName: string,
  mimeType: string,
  folder?: string
): Promise<UploadResult> {
  const client = getClient();
  const ext = originalName.split(".").pop() || "";
  const storedName = folder
    ? `${folder}/${randomUUID()}.${ext}`
    : `${randomUUID()}.${ext}`;

  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: storedName,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.byteLength,
  };

  await client.send(new PutObjectCommand(params));

  const url = publicUrl ? `${publicUrl}/${storedName}` : null;

  return {
    storedName,
    url,
    size: buffer.byteLength,
    mimeType,
  };
}

// ─── Download / Signed URL ───────────────────────────────────

/**
 * Generate a pre-signed URL for downloading a file (valid for `expiresIn` seconds).
 */
export async function getDownloadUrl(
  storedName: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getClient();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storedName,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for viewing a file inline (sets Content-Disposition: inline).
 */
export async function getViewUrl(
  storedName: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getClient();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storedName,
    ResponseContentDisposition: "inline",
  });

  return getSignedUrl(client, command, { expiresIn });
}

// ─── Delete ──────────────────────────────────────────────────

/**
 * Delete a file from R2.
 */
export async function deleteFile(storedName: string): Promise<void> {
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storedName,
    })
  );
}

// ─── Metadata ────────────────────────────────────────────────

/**
 * Check if a file exists and get its metadata.
 */
export async function getFileMetadata(
  storedName: string
): Promise<{ size: number; mimeType: string; lastModified: Date } | null> {
  const client = getClient();

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: storedName,
      })
    );

    return {
      size: response.ContentLength || 0,
      mimeType: response.ContentType || "application/octet-stream",
      lastModified: response.LastModified || new Date(),
    };
  } catch {
    return null;
  }
}

// ─── Utilities ───────────────────────────────────────────────

/**
 * Format bytes into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Get a file extension from a MIME type.
 */
export function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/zip": "zip",
    "application/json": "json",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
  };
  return map[mimeType] || "bin";
}

// Re-export types
export type { S3Client };
