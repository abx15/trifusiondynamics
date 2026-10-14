/**
 * Secret Provider Interface
 *
 * Defines the contract for secret providers (Vault, AWS Secrets Manager, Environment Variables)
 */
export interface SecretProvider {
  /**
   * Get a secret by key
   */
  getSecret(key: string): Promise<string | null>;

  /**
   * Get multiple secrets by prefix
   */
  getSecretsByPrefix(prefix: string): Promise<Record<string, string>>;

  /**
   * Check if provider is available/healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get provider name for logging
   */
  getName(): string;
}

/**
 * Secret metadata for caching
 */
export interface SecretCacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Secret rotation event
 */
export interface SecretRotationEvent {
  key: string;
  oldValue: string;
  newValue: string;
  timestamp: Date;
  provider: string;
}
