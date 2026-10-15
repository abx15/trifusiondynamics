import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageProvider, storageProvider } from './s3.storage.provider';
import { StorageProviderInterface, UploadOptions } from './storage.interface';

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3StorageProvider],
    }).compile();

    provider = module.get<S3StorageProvider>(S3StorageProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should implement StorageProviderInterface', () => {
    expect(typeof provider.upload).toBe('function');
    expect(typeof provider.getSignedUrl).toBe('function');
    expect(typeof provider.delete).toBe('function');
    expect(typeof provider.list).toBe('function');
    expect(typeof provider.getPublicUrl).toBe('function');
    expect(typeof provider.healthCheck).toBe('function');
  });

  it('should have configure method', () => {
    expect(typeof provider.configure).toBe('function');
  });

  it('should return empty public url when not configured', () => {
    const url = provider.getPublicUrl('test-key');
    expect(url).toBe('');
  });
});

describe('Storage Interface', () => {
  it('should have correct types', () => {
    const config: UploadOptions = {
      key: 'test/file.txt',
      body: Buffer.from('test'),
      contentType: 'text/plain',
      metadata: { custom: 'value' },
      acl: 'private',
      cacheControl: 'max-age=3600',
    };

    expect(config.key).toBe('test/file.txt');
    expect(config.acl).toBe('private');
  });
});