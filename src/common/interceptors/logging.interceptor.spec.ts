import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  function createMockContext(
    method: string,
    url: string,
    statusCode: number,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log request method, url, status, and duration', (done) => {
    const context = createMockContext('GET', '/api/health', 200);
    const callHandler: CallHandler = { handle: () => of('response') };

    interceptor.intercept(context, callHandler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledTimes(1);
      const logMessage = logSpy.mock.calls[0][0];
      expect(logMessage).toContain('GET');
      expect(logMessage).toContain('/api/health');
      expect(logMessage).toContain('200');
      expect(logMessage).toMatch(/\d+ms/);
      done();
    });
  });

  it('should pass through the response unchanged', (done) => {
    const context = createMockContext('POST', '/api/users', 201);
    const responseData = { id: 1, name: 'Test' };
    const callHandler: CallHandler = { handle: () => of(responseData) };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual(responseData);
      done();
    });
  });

  it('should log different HTTP methods correctly', (done) => {
    const context = createMockContext('DELETE', '/api/projects/123', 204);
    const callHandler: CallHandler = { handle: () => of(null) };

    interceptor.intercept(context, callHandler).subscribe(() => {
      const logMessage = logSpy.mock.calls[0][0];
      expect(logMessage).toContain('DELETE');
      expect(logMessage).toContain('/api/projects/123');
      expect(logMessage).toContain('204');
      done();
    });
  });
});
