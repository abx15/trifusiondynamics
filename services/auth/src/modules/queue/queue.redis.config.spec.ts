import { getQueueRedisConnection } from './queue.redis.config';

describe('getQueueRedisConnection', () => {
  const originalEnv = {
    redisUrl: process.env.REDIS_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    redisUsername: process.env.REDIS_USERNAME,
    redisPassword: process.env.REDIS_PASSWORD,
    redisTls: process.env.REDIS_TLS,
  };

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_USERNAME;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
  });

  afterAll(() => {
    if (originalEnv.redisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalEnv.redisUrl;
    if (originalEnv.redisHost === undefined) delete process.env.REDIS_HOST;
    else process.env.REDIS_HOST = originalEnv.redisHost;
    if (originalEnv.redisPort === undefined) delete process.env.REDIS_PORT;
    else process.env.REDIS_PORT = originalEnv.redisPort;
    if (originalEnv.redisUsername === undefined)
      delete process.env.REDIS_USERNAME;
    else process.env.REDIS_USERNAME = originalEnv.redisUsername;
    if (originalEnv.redisPassword === undefined)
      delete process.env.REDIS_PASSWORD;
    else process.env.REDIS_PASSWORD = originalEnv.redisPassword;
    if (originalEnv.redisTls === undefined) delete process.env.REDIS_TLS;
    else process.env.REDIS_TLS = originalEnv.redisTls;
  });

  it('parses Render-style Redis URLs including TLS and credentials', () => {
    process.env.REDIS_URL =
      'rediss://queue-user:queue%40secret@redis.example.com:6380/2';

    expect(getQueueRedisConnection()).toMatchObject({
      host: 'redis.example.com',
      port: 6380,
      username: 'queue-user',
      password: 'queue@secret',
      db: 2,
      tls: {},
      maxRetriesPerRequest: 3,
    });
  });

  it('uses host-based configuration for local development', () => {
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6381';
    process.env.REDIS_PASSWORD = 'local-secret';

    expect(getQueueRedisConnection(null)).toMatchObject({
      host: '127.0.0.1',
      port: 6381,
      password: 'local-secret',
      maxRetriesPerRequest: null,
    });
  });

  it('rejects unsupported Redis URL protocols', () => {
    process.env.REDIS_URL = 'https://redis.example.com';

    expect(() => getQueueRedisConnection()).toThrow(
      'REDIS_URL must use the redis:// or rediss:// protocol',
    );
  });
});
