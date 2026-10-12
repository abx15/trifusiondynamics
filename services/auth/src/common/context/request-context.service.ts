import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<Map<string, string>>();

  run<T>(context: Map<string, string>, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get<T>(key: string): T | undefined {
    const store = this.storage.getStore();
    return store?.get(key) as T | undefined;
  }

  set(key: string, value: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  getOrgId(): string | undefined {
    return this.get<string>('orgId');
  }

  setOrgId(orgId: string): void {
    this.set('orgId', orgId);
  }
}

export const requestContextService = new RequestContextService();
