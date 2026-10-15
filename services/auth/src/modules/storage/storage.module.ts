import { Module, Global } from '@nestjs/common';
import { S3StorageProvider, storageProvider } from './s3.storage.provider';
import { StorageProviderInterface } from './storage.interface';

@Global()
@Module({
  providers: [
    S3StorageProvider,
    {
      provide: 'STORAGE_PROVIDER',
      useExisting: S3StorageProvider,
    },
  ],
  exports: [S3StorageProvider, 'STORAGE_PROVIDER'],
})
export class StorageModule {}