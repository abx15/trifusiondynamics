import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecretsService } from './secrets.service';
import { EnvSecretProvider } from './providers/env.secret.provider';
import { VaultSecretProvider } from './providers/vault.secret.provider';
import { AwsSecretsManagerProvider } from './providers/aws-secrets-manager.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    EnvSecretProvider,
    VaultSecretProvider,
    AwsSecretsManagerProvider,
    SecretsService,
  ],
  exports: [SecretsService],
})
export class SecretsModule {}
