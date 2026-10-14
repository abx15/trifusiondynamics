import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretProvider } from './interfaces/secret-provider.interface';
import { EnvSecretProvider } from './providers/env.secret.provider';
import { VaultSecretProvider } from './providers/vault.secret.provider';
import { AwsSecretsManagerProvider } from './providers/aws-secrets-manager.provider';
import {
  SecretCacheEntry,
  SecretRotationEvent,
} from './interfaces/secret-provider.interface';

/**
 * Secrets Service
 *
 * Central service for managing secrets from multiple providers with caching,
 * automatic fallback, and rotation support.
 *
 * Provider priority (highest first):
 * 1. HashiCorp Vault (if configured)
 * 2. AWS Secrets Manager (if configured)
 * 3. Environment Variables (always available)
 */
@Injectable()
export class SecretsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecretsService.name);
  private readonly providers: SecretProvider[] = [];
  private readonly cache = new Map<string, SecretCacheEntry>();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes
  private rotationCheckInterval: NodeJS.Timeout | null = null;
  private readonly eventHandlers: Array<(event: SecretRotationEvent) => void> =
    [];

  constructor(
    private readonly configService: ConfigService,
    @Inject(EnvSecretProvider) private readonly envProvider: EnvSecretProvider,
    @Inject(VaultSecretProvider)
    private readonly vaultProvider: VaultSecretProvider,
    @Inject(AwsSecretsManagerProvider)
    private readonly awsProvider: AwsSecretsManagerProvider,
  ) {
    // Order matters: Vault -> AWS -> Env (fallback)
    this.providers = [this.vaultProvider, this.awsProvider, this.envProvider];
  }

  async onModuleInit(): Promise<void> {
    await this.initializeProviders();
    this.startRotationChecker();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
      this.rotationCheckInterval = null;
    }
  }

  private async initializeProviders(): Promise<void> {
    this.logger.log('Initializing secret providers...');

    for (const provider of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        if (healthy) {
          this.logger.log(`✅ ${provider.getName()} provider is healthy`);
        } else {
          this.logger.warn(
            `⚠️ ${provider.getName()} provider is not available`,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ ${provider.getName()} provider failed health check:`,
          error,
        );
      }
    }

    // Log which provider will be used as primary
    const primary = this.providers.find((p) => p.isHealthy());
    if (primary) {
      this.logger.log(`🔐 Primary secret provider: ${primary.getName()}`);
    } else {
      this.logger.warn(
        '⚠️ No healthy secret providers, using environment variables only',
      );
    }
  }

  /**
   * Get a secret by key, checking all providers in priority order
   */
  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for secret: ${key}`);
      return cached.value;
    }

    // Check each provider in order
    for (const provider of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        if (!healthy) {
          continue;
        }

        const value = await provider.getSecret(key);
        if (value !== null) {
          // Cache the result
          this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.cacheTtl,
          });
          this.logger.debug(
            `Retrieved secret ${key} from ${provider.getName()}`,
          );
          return value;
        }
      } catch (error) {
        this.logger.warn(
          `Error getting secret ${key} from ${provider.getName()}:`,
          error,
        );
        continue;
      }
    }

    this.logger.warn(`Secret not found in any provider: ${key}`);
    return null;
  }

  /**
   * Get a secret with a default fallback
   */
  async getSecretOrDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.getSecret(key);
    return value ?? defaultValue;
  }

  /**
   * Get required secret (throws if not found)
   */
  async getRequiredSecret(key: string): Promise<string> {
    const value = await this.getSecret(key);
    if (value === null) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  /**
   * Get JWT Access Secret
   */
  async getJwtAccessSecret(): Promise<string> {
    return this.getRequiredSecret('JWT_ACCESS_SECRET');
  }

  /**
   * Get JWT Refresh Secret
   */
  async getJwtRefreshSecret(): Promise<string> {
    return this.getRequiredSecret('JWT_REFRESH_SECRET');
  }

  /**
   * Get AI Service Secret
   */
  async getAiServiceSecret(): Promise<string> {
    return this.getRequiredSecret('AI_SERVICE_SECRET');
  }

  /**
   * Get Database URL
   */
  async getDatabaseUrl(): Promise<string> {
    return this.getSecretOrDefault('DATABASE_URL', '');
  }

  /**
   * Get Redis URL
   */
  async getRedisUrl(): Promise<string> {
    return this.getSecretOrDefault('REDIS_URL', '');
  }

  /**
   * Get all secrets with a given prefix from all providers
   */
  async getSecretsByPrefix(prefix: string): Promise<Record<string, string>> {
    const allSecrets: Record<string, string> = {};

    for (const provider of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        if (!healthy) {
          continue;
        }

        const secrets = await provider.getSecretsByPrefix(prefix);
        // Don't overwrite secrets from higher-priority providers
        for (const [key, value] of Object.entries(secrets)) {
          if (!(key in allSecrets)) {
            allSecrets[key] = value;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Error getting secrets by prefix ${prefix} from ${provider.getName()}:`,
          error,
        );
      }
    }

    return allSecrets;
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache invalidated for secret: ${key}`);
  }

  /**
   * Invalidate all cached secrets
   */
  invalidateAllCache(): void {
    this.cache.clear();
    this.logger.log('All secret caches invalidated');
  }

  /**
   * Register a rotation event handler
   */
  onRotation(handler: (event: SecretRotationEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit a rotation event to all handlers
   */
  private emitRotationEvent(event: SecretRotationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Error in rotation event handler:', error);
      }
    }
  }

  /**
   * Start periodic rotation checker
   * Checks for secret changes in providers and emits events
   */
  private startRotationChecker(): void {
    const checkInterval =
      this.configService.get('SECRET_ROTATION_CHECK_INTERVAL_MS') ||
      5 * 60 * 1000; // 5 minutes

    this.rotationCheckInterval = setInterval(async () => {
      await this.checkForRotations();
    }, checkInterval);

    // Don't prevent process exit
    if (this.rotationCheckInterval.unref) {
      this.rotationCheckInterval.unref();
    }

    this.logger.log(
      `Secret rotation checker started (interval: ${checkInterval}ms)`,
    );
  }

  /**
   * Check for secret rotations by comparing cached values with provider values
   */
  private async checkForRotations(): Promise<void> {
    this.logger.debug('Checking for secret rotations...');

    for (const [key, cachedEntry] of this.cache.entries()) {
      // Only check secrets that are still valid in cache
      if (cachedEntry.expiresAt <= Date.now()) {
        continue;
      }

      for (const provider of this.providers) {
        try {
          const healthy = await provider.isHealthy();
          if (!healthy) {
            continue;
          }

          const currentValue = await provider.getSecret(key);
          if (currentValue !== null && currentValue !== cachedEntry.value) {
            // Secret has changed!
            this.logger.warn(
              `Secret rotation detected for ${key} in ${provider.getName()}`,
            );

            const event: SecretRotationEvent = {
              key,
              oldValue: cachedEntry.value,
              newValue: currentValue,
              timestamp: new Date(),
              provider: provider.getName(),
            };

            // Update cache with new value
            this.cache.set(key, {
              value: currentValue,
              expiresAt: Date.now() + this.cacheTtl,
            });

            // Emit rotation event
            this.emitRotationEvent(event);
            break; // Only emit once per secret
          }
        } catch (error) {
          this.logger.warn(
            `Error checking rotation for ${key} in ${provider.getName()}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Force refresh a secret from providers (bypass cache)
   */
  async refreshSecret(key: string): Promise<string | null> {
    this.invalidateCache(key);
    return this.getSecret(key);
  }

  /**
   * Get cache stats for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
