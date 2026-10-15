import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  StorageConfig,
  UploadOptions,
  UploadResult,
  SignedUrlOptions,
  SignedUrlResult,
  DeleteOptions,
  DeleteResult,
  ListOptions,
  ListResult,
  StorageProviderInterface,
} from './storage.interface';

@Injectable()
export class S3StorageProvider implements StorageProviderInterface, OnModuleInit {
  private readonly logger = new Logger(S3StorageProvider.name);
  private client: S3Client | null = null;
  private config: StorageConfig | null = null;
  private readonly ready = false;

  onModuleInit(): void {
    this.initFromEnv();
  }

  configure(config: StorageConfig): void {
    this.config = config;
    this.client = this.createClient(config);
    this.logger.log(`Storage configured: ${config.provider} (${config.bucket})`);
  }

  private initFromEnv(): void {
    const provider = (process.env.STORAGE_PROVIDER as StorageProvider) || 's3';
    const region = process.env.STORAGE_REGION || 'us-east-1';
    const bucket = process.env.STORAGE_BUCKET;
    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
    const forcePathStyle = process.env.STORAGE_FORCE_PATH_STYLE === 'true';
    const publicUrlBase = process.env.STORAGE_PUBLIC_URL_BASE;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      this.logger.warn('Storage not configured - missing required env vars');
      return;
    }

    this.configure({
      provider,
      region,
      bucket,
      endpoint,
      accessKeyId,
      secretAccessKey,
      forcePathStyle,
      publicUrlBase,
    });
  }

  private createClient(config: StorageConfig): S3Client {
    return new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? (config.provider === 'minio' || config.provider === 'r2'),
    });
  }

  private ensureClient(): S3Client {
    if (!this.client || !this.config) {
      throw new Error('Storage not configured. Call configure() or set environment variables.');
    }
    return this.client;
  }

  private getBucket(): string {
    if (!this.config) {
      throw new Error('Storage not configured');
    }
    return this.config.bucket;
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const client = this.ensureClient();
    const bucket = this.getBucket();

    const body = typeof options.body === 'string'
      ? Buffer.from(options.body)
      : Buffer.from(options.body);

    const commandInput: PutObjectCommandInput = {
      Bucket: bucket,
      Key: options.key,
      Body: body,
      ContentType: options.contentType,
      Metadata: options.metadata,
      ACL: options.acl,
      CacheControl: options.cacheControl,
    };

    try {
      const command = new PutObjectCommand(commandInput);
      const response = await client.send(command);

      return {
        key: options.key,
        url: this.getPublicUrl(options.key),
        etag: response.ETag?.replace(/"/g, ''),
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult> {
    const client = this.ensureClient();
    const bucket = this.getBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: options.key,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: options.responseContentDisposition,
    });

    try {
      const url = await getSignedUrl(client, command, {
        expiresIn: options.expiresIn,
      });

      return {
        url,
        expiresAt: Date.now() + options.expiresIn * 1000,
      };
    } catch (error) {
      this.logger.error(`Signed URL generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async delete(options: DeleteOptions): Promise<DeleteResult> {
    const client = this.ensureClient();
    const bucket = this.getBucket();

    if (options.keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: options.keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    });

    try {
      const response = await client.send(command);

      return {
        deleted: response.Deleted?.map(d => d.Key || '').filter(Boolean) || [],
        errors: response.Errors?.map(e => ({
          key: e.Key || '',
          code: e.Code || 'Unknown',
          message: e.Message || 'Unknown error',
        })) || [],
      };
    } catch (error) {
      this.logger.error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    const client = this.ensureClient();
    const bucket = this.getBucket();

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: options.prefix,
      Delimiter: options.delimiter,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
    });

    try {
      const response = await client.send(command);

      return {
        objects: (response.Contents || []).map(obj => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          etag: obj.ETag?.replace(/"/g, '') || '',
          storageClass: obj.StorageClass,
        })),
        prefixes: (response.CommonPrefixes || []).map(p => p.Prefix || ''),
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      this.logger.error(`List failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    if (!this.config) {
      return '';
    }

    if (this.config.publicUrlBase) {
      return `${this.config.publicUrlBase.replace(/\/$/, '')}/${key}`;
    }

    if (this.config.endpoint) {
      const endpoint = this.config.endpoint.replace(/\/$/, '');
      const bucket = this.config.bucket;
      return `${endpoint}/${bucket}/${key}`;
    }

    const region = this.config.region;
    const bucket = this.config.bucket;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.config) {
      return false;
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageProvider = new S3StorageProvider();