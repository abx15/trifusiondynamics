import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Vault from 'node-vault';
import { SecretProvider } from '../interfaces/secret-provider.interface';

/**
 * HashiCorp Vault Secret Provider
 *
 * Integrates with HashiCorp Vault for centralized secret management.
 * Supports KV v1 and v2 engines.
 */
@Injectable()
export class VaultSecretProvider
  implements SecretProvider, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VaultSecretProvider.name);
  private client: ReturnType<typeof Vault> | null = null;
  private readonly mountPath: string;
  private readonly kvVersion: 1 | 2;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.mountPath = this.configService.get('VAULT_MOUNT_PATH') || 'secret';
    this.kvVersion = this.configService.get('VAULT_KV_VERSION') === '1' ? 1 : 2;
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    // Cleanup if needed
    this.initialized = false;
  }

  private async initialize(): Promise<void> {
    try {
      const vaultUrl = this.configService.get('VAULT_URL');
      const vaultToken = this.configService.get('VAULT_TOKEN');
      const vaultRole = this.configService.get('VAULT_ROLE');

      if (!vaultUrl) {
        this.logger.warn(
          'VAULT_URL not configured, Vault provider will not be available',
        );
        return;
      }

      const options: Vault.Option = {
        endpoint: vaultUrl,
        timeout: 5000,
      };

      // Authenticate using token or AppRole
      if (vaultToken) {
        options.token = vaultToken;
      } else if (vaultRole) {
        options.approle = {
          role_id: this.configService.get('VAULT_ROLE_ID') || '',
          secret_id: this.configService.get('VAULT_SECRET_ID') || '',
        };
      } else {
        this.logger.warn(
          'No Vault authentication method configured (token or AppRole)',
        );
        return;
      }

      this.client = Vault(options);

      // Test connection
      await this.client.read('sys/health');
      this.initialized = true;
      this.logger.log(
        `Vault provider initialized at ${vaultUrl} (KV v${this.kvVersion})`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Vault provider:', error);
      this.initialized = false;
    }
  }

  getName(): string {
    return 'HashiCorp Vault';
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.read('sys/health');
      return true;
    } catch {
      return false;
    }
  }

  async getSecret(key: string): Promise<string | null> {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const path = this.getSecretPath(key);
      const response = await this.client.read(path);

      if (!response || !response.data) {
        return null;
      }

      // KV v2 wraps data in a `data` property
      const data = this.kvVersion === 2 ? response.data.data : response.data;
      return data[key] ?? null;
    } catch (error) {
      this.logger.warn(`Failed to read secret ${key} from Vault:`, error);
      return null;
    }
  }

  async getSecretsByPrefix(prefix: string): Promise<Record<string, string>> {
    if (!this.initialized || !this.client) {
      return {};
    }

    try {
      const path = this.getSecretPath(prefix);
      const response = await this.client.list(path);

      if (!response || !response.data || !response.data.keys) {
        return {};
      }

      const secrets: Record<string, string> = {};

      // For each key, read the actual secret
      for (const key of response.data.keys) {
        const secretPath = `${path}${key}`;
        const secretResponse = await this.client.read(secretPath);
        if (secretResponse && secretResponse.data) {
          const data =
            this.kvVersion === 2
              ? secretResponse.data.data
              : secretResponse.data;
          Object.assign(secrets, data);
        }
      }

      return secrets;
    } catch (error) {
      this.logger.warn(
        `Failed to list secrets with prefix ${prefix} from Vault:`,
        error,
      );
      return {};
    }
  }

  private getSecretPath(key: string): string {
    const versionPrefix = this.kvVersion === 2 ? 'data/' : '';
    return `${this.mountPath}/${versionPrefix}${key}`;
  }
}
