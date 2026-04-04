import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from './correlation-id.middleware';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockReq = { headers: {} };
    mockRes = { setHeader: jest.fn() };
    nextFn = jest.fn();
  });

  it('should generate a correlation ID when none is provided', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFn);

    expect(mockReq['correlationId']).toBeDefined();
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      expect.any(String),
    );
    expect(nextFn).toHaveBeenCalled();
  });

  it('should use the provided correlation ID from headers', () => {
    const existingId = 'test-correlation-id-123';
    mockReq.headers = { [CORRELATION_ID_HEADER]: existingId };

    middleware.use(mockReq as Request, mockRes as Response, nextFn);

    expect(mockReq['correlationId']).toBe(existingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      existingId,
    );
    expect(nextFn).toHaveBeenCalled();
  });

  it('should generate a UUID format correlation ID', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFn);

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(mockReq['correlationId']).toMatch(uuidRegex);
  });
});
