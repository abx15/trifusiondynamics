import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ListSecretsCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import { SecretProvider } from '../interfaces/secret-provider.interface';

/**
 * AWS Secrets Manager Secret Provider
 *
 * Integrates with AWS Secrets Manager for cloud-based secret management.
 * Supports automatic rotation via AWS Lambda rotation functions.
 */
@Injectable()
export class AwsSecretsManagerProvider implements SecretProvider, OnModuleInit {
  private readonly logger = new Logger(AwsSecretsManagerProvider.name);
  private client: SecretsManagerClient | null = null;
  private readonly region: string;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION') || 'us-east-1';
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
      const sessionToken = this.configService.get('AWS_SESSION_TOKEN');

      if (!accessKeyId || !secretAccessKey) {
        // Try to use IAM role if running in AWS
        this.logger.log(
          'AWS credentials not explicitly configured, attempting IAM role',
        );
      }

      this.client = new SecretsManagerClient({
        region: this.region,
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey, sessionToken }
            : undefined, // Will use default credential chain (IAM role, etc.)
      });

      // Test connection by listing secrets (limit 1)
      await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
      this.initialized = true;
      this.logger.log(
        `AWS Secrets Manager provider initialized in ${this.region}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize AWS Secrets Manager provider:',
        error,
      );
      this.initialized = false;
    }
  }

  getName(): string {
    return 'AWS Secrets Manager';
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
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
      const command = new GetSecretValueCommand({ SecretId: key });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        // Binary secret - convert from base64 if needed
        if (response.SecretBinary) {
          return Buffer.from(response.SecretBinary as any).toString('utf-8');
        }
        return null;
      }

      // Try to parse as JSON (AWS often stores secrets as JSON)
      try {
        const parsed = JSON.parse(response.SecretString);
        // If it's an object with a single key matching our key, return that value
        if (typeof parsed === 'object' && parsed !== null && key in parsed) {
          return String(parsed[key]);
        }
        // Otherwise return the whole JSON string
        return response.SecretString;
      } catch {
        // Not JSON, return as-is
        return response.SecretString;
      }
    } catch (error) {
      const awsError = error;
      if (awsError.name === 'ResourceNotFoundException') {
        this.logger.debug(`Secret ${key} not found in AWS Secrets Manager`);
      } else {
        this.logger.warn(
          `Failed to read secret ${key} from AWS Secrets Manager:`,
          error,
        );
      }
      return null;
    }
  }

  async getSecretsByPrefix(prefix: string): Promise<Record<string, string>> {
    if (!this.initialized || !this.client) {
      return {};
    }

    try {
      const secrets: Record<string, string> = {};
      let nextToken: string | undefined;

      do {
        const command = new ListSecretsCommand({
          Filters: [{ Key: 'name', Values: [prefix] }],
          MaxResults: 100,
          NextToken: nextToken,
        });
        const response = await this.client.send(command);

        if (response.SecretList) {
          for (const secret of response.SecretList) {
            if (secret.Name) {
              const value = await this.getSecret(secret.Name);
              if (value) {
                secrets[secret.Name] = value;
              }
            }
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return secrets;
    } catch (error) {
      this.logger.warn(
        `Failed to list secrets with prefix ${prefix} from AWS Secrets Manager:`,
        error,
      );
      return {};
    }
  }
}
