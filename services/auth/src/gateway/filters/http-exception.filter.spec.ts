import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  it('logs the internal error while returning a generic production response', () => {
    const filter = new AllExceptionsFilter();
    const error = new Error('Database column is missing');
    const logSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = {
      headers: {},
      id: 'request-123',
      method: 'POST',
      url: '/api/auth/login',
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ status }),
      }),
    } as ArgumentsHost;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      filter.catch(error, host);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('errorName="Error"'),
        error.stack,
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"Database column is missing"'),
        error.stack,
      );
      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
      logSpy.mockRestore();
    }
  });
});
