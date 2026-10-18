import { BadRequestException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { z } from 'zod';
import { ZodBody, ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  it('registers a request body parameter with Nest', () => {
    class TestController {
      login(): void {}
    }

    ZodBody(loginSchema)(TestController.prototype, 'login', 0);

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'login',
    ) as Record<string, { pipes: unknown[] }>;

    expect(Object.values(metadata)).toHaveLength(1);
    expect(Object.values(metadata)[0].pipes[0]).toBeInstanceOf(
      ZodValidationPipe,
    );
  });

  it('validates a bound schema and returns parsed request data', () => {
    const pipe = new ZodValidationPipe(loginSchema);

    expect(
      pipe.transform({
        email: 'user@example.com',
        password: 'secret1',
        extra: true,
      }),
    ).toEqual({ email: 'user@example.com', password: 'secret1' });
  });

  it('rejects invalid request data', () => {
    const pipe = new ZodValidationPipe(loginSchema);

    expect(() =>
      pipe.transform({ email: 'invalid', password: 'short' }),
    ).toThrow(BadRequestException);
  });

  it('leaves data unchanged when used as a global pipe', () => {
    const data = { unchanged: true };

    expect(new ZodValidationPipe().transform(data)).toBe(data);
  });
});
