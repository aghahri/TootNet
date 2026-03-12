/**
 * Abstract storage interface for media files.
 * Implementations can use S3, Cloudflare R2, MinIO, or local storage.
 * MVP: no binary upload in backend yet; register accepts URL from client.
 * Future: getUploadUrl(), confirmUpload(), deleteObject(), etc.
 */
export interface StorageProvider {
  /** Generate a signed or public URL for upload (future). */
  getUploadUrl?(key: string, contentType: string): Promise<string>;

  /** Persist file from stream (future). */
  save?(key: string, stream: NodeJS.ReadableStream, metadata: { contentType: string; size?: number }): Promise<string>;

  /** Return public or signed URL for reading (future). */
  getUrl?(key: string): Promise<string>;

  /** Delete object by key (future: for cleanup / moderation). */
  delete?(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
