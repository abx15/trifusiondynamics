import { Injectable } from '@nestjs/common';
import { SecretProvider } from '../interfaces/secret-provider.interface';

/**
 * Environment Variable Secret Provider
 *
 * Used for development and as fallback when external providers are unavailable.
 * Reads secrets directly from process.env.
 */
@Injectable()
export class EnvSecretProvider implements SecretProvider {
  private readonly prefix = 'SECRET_';

  getName(): string {
    return 'Environment Variables';
  }

  async isHealthy(): Promise<boolean> {
    return true; // Env vars are always available
  }

  async getSecret(key: string): Promise<string | null> {
    // Try with prefix first, then without
    const prefixedKey = `${this.prefix}${key}`;
    const value = process.env[prefixedKey] ?? process.env[key];
    return value ?? null;
  }

  async getSecretsByPrefix(prefix: string): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};
    const searchPrefix = `${this.prefix}${prefix}`;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(searchPrefix) && value) {
        const secretKey = key.slice(searchPrefix.length);
        secrets[secretKey] = value;
      }
    }

    return secrets;
  }
}
