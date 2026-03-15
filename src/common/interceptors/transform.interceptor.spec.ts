import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  function createMockContext(statusCode: number): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockContext = createMockContext(200);
  });

  it('should wrap response in { statusCode, data, timestamp }', (done) => {
    mockCallHandler = { handle: () => of({ id: 1, name: 'Test' }) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toHaveProperty('statusCode', 200);
      expect(result).toHaveProperty('data', { id: 1, name: 'Test' });
      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
      done();
    });
  });

  it('should preserve the original HTTP status code', (done) => {
    mockContext = createMockContext(201);
    mockCallHandler = { handle: () => of({ created: true }) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.statusCode).toBe(201);
      done();
    });
  });

  it('should handle null data', (done) => {
    mockCallHandler = { handle: () => of(null) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeNull();
      done();
    });
  });

  it('should handle array data', (done) => {
    const items = [{ id: 1 }, { id: 2 }];
    mockCallHandler = { handle: () => of(items) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual(items);
      expect(Array.isArray(result.data)).toBe(true);
      done();
    });
  });

  it('should handle empty object data', (done) => {
    mockCallHandler = { handle: () => of({}) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual({});
      done();
    });
  });

  it('should handle string data', (done) => {
    mockCallHandler = { handle: () => of('plain text') };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toBe('plain text');
      done();
    });
  });
});
