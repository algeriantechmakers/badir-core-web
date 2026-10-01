import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { BUCKETS } from "@/types/Statics";

/**
 * S3-compatible object storage (MinIO in local development, Cloudflare R2 in
 * deployed environments). Replaces the former Supabase Storage client.
 *
 * The three logical buckets (`avatars`, `documents`, `post-images`) are key
 * prefixes inside a single S3 bucket rather than separate buckets: one set of
 * credentials and one public-access policy to configure, which is what R2
 * expects.
 */

const BUCKET_PREFIXES: readonly BUCKETS[] = [
  "avatars",
  "documents",
  "post-images",
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

let client: S3Client | null = null;

/**
 * Built lazily so that importing this module never throws — `next build`
 * evaluates server modules without the runtime S3 credentials present.
 */
function s3(): S3Client {
  if (client) return client;

  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: requireEnv("S3_ENDPOINT"),
    // MinIO serves path-style URLs (<endpoint>/<bucket>/<key>); R2 and S3 do not.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  return client;
}

/** The single physical S3 bucket holding every prefix. */
function bucketName(): string {
  return requireEnv("S3_BUCKET");
}

/** Public base URL objects are served from (CDN domain, or the MinIO bucket URL). */
function publicBaseUrl(): string {
  return requireEnv("S3_PUBLIC_URL").replace(/\/+$/, "");
}

/** `avatars` + `user-1/photo.png` -> `avatars/user-1/photo.png` */
function objectKey(bucket: BUCKETS, path: string): string {
  return `${bucket}/${path.replace(/^\/+/, "")}`;
}

/** Percent-encodes each segment while leaving the `/` separators intact. */
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Drops a leading logical-bucket segment, since every caller passes the bucket
 * to `deleteFile`/`getPublicUrl` separately from the path.
 */
function stripBucketPrefix(path: string): string {
  const [first, ...rest] = path.split("/");
  const isBucket = (BUCKET_PREFIXES as readonly string[]).includes(first);
  return isBucket && rest.length > 0 ? rest.join("/") : path;
}

/**
 * Recovers the storage-relative path from a stored URL.
 *
 * Must handle both shapes, because rows written before this migration still
 * hold Supabase public URLs:
 *   - legacy: `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`
 *   - current: `${S3_PUBLIC_URL}/<bucket>/<path>`
 *
 * @param url The stored public URL (or an already-relative path).
 * @returns The path within the logical bucket, or null.
 */
export function extractStoragePath(url: string | null): string | null {
  if (!url) return null;

  const legacy = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (legacy) return decodeURIComponent(legacy[1]);

  try {
    let path = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, "");

    // Path-style endpoints (MinIO) prepend the physical bucket to the key.
    const physical = process.env.S3_BUCKET;
    if (physical && path.startsWith(`${physical}/`)) {
      path = path.slice(physical.length + 1);
    }

    return stripBucketPrefix(path) || null;
  } catch {
    // Not an absolute URL — treat it as a storage path that may carry a prefix.
    return stripBucketPrefix(url.replace(/^\/+/, "")) || null;
  }
}

export class StorageHelpers {
  /**
   * Uploads a file, overwriting any object already at that path.
   *
   * @returns `{ path }` — the storage-relative path, matching the shape the
   * former Supabase client returned so callers stay unchanged.
   */
  async uploadFile(bucket: BUCKETS, path: string, file: Buffer, type?: string) {
    const key = objectKey(bucket, path);

    await s3().send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: key,
        Body: file,
        ContentType: type,
      }),
    );

    return { path: path.replace(/^\/+/, "") };
  }

  async getPublicUrl(bucket: BUCKETS, path: string) {
    return `${publicBaseUrl()}/${encodeKey(objectKey(bucket, path))}`;
  }

  async deleteFile(bucket: BUCKETS, path: string) {
    await s3().send(
      new DeleteObjectCommand({
        Bucket: bucketName(),
        Key: objectKey(bucket, path),
      }),
    );
  }

  async downloadFile(bucket: BUCKETS, path: string) {
    const response = await s3().send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: objectKey(bucket, path),
      }),
    );

    if (!response.Body) throw new Error(`Empty response body for ${path}`);

    // Buffer the stream rather than returning it: an unread stream holds its
    // socket open, and a Blob preserves the previous return type.
    const bytes = await response.Body.transformToByteArray();
    return new Blob([bytes as Uint8Array<ArrayBuffer>], {
      type: response.ContentType,
    });
  }

  async listFiles(bucket: BUCKETS, folder: string = "") {
    const prefix = folder ? `${objectKey(bucket, folder)}/` : `${bucket}/`;

    const response = await s3().send(
      new ListObjectsV2Command({
        Bucket: bucketName(),
        Prefix: prefix.replace(/\/+$/, "/"),
      }),
    );

    return (response.Contents ?? []).map((object) => ({
      name: (object.Key ?? "").slice(prefix.length),
      size: object.Size,
      updatedAt: object.LastModified,
    }));
  }
}
