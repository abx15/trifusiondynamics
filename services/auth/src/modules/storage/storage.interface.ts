export type StorageProvider = 's3' | 'r2' | 'minio';

export interface StorageConfig {
  provider: StorageProvider;
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  publicUrlBase?: string;
}

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  cacheControl?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

export interface SignedUrlOptions {
  key: string;
  expiresIn: number;
  method?: 'GET' | 'PUT' | 'DELETE';
  contentType?: string;
  responseContentDisposition?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: number;
}

export interface DeleteOptions {
  keys: string[];
}

export interface DeleteResult {
  deleted: string[];
  errors: Array<{ key: string; code: string; message: string }>;
}

export interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
    storageClass?: string;
  }>;
  prefixes: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export interface StorageProviderInterface {
  upload(options: UploadOptions): Promise<UploadResult>;
  getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult>;
  delete(options: DeleteOptions): Promise<DeleteResult>;
  list(options: ListOptions): Promise<ListResult>;
  getPublicUrl(key: string): string;
  healthCheck(): Promise<boolean>;
}