import {
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: {
    switchToHttp: () => {
      getResponse: () => { status: jest.Mock };
      getRequest: () => { method: string; url: string };
    };
  };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }) as any,
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
      }),
    };

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return correct shape for HttpException with string message', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(404);
    const body = mockJson.mock.calls[0][0];
    expect(body).toHaveProperty('statusCode', 404);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path', '/api/test');
    expect(body).toHaveProperty('message', 'Not found');
  });

  it('should spread object response from HttpException', () => {
    const exception = new BadRequestException({
      message: 'Validation failed',
      errors: { name: ['required'] },
    });

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const body = mockJson.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(body.errors).toEqual({ name: ['required'] });
  });

  it('should return 500 for non-HttpException errors', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const body = mockJson.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
  });

  it('should log stack trace for 500 errors', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error');
    const exception = new Error('Unexpected crash');

    filter.catch(exception, mockHost as any);

    expect(logSpy).toHaveBeenCalledWith(
      '[-] GET /api/test',
      expect.stringContaining('Unexpected crash'),
    );
  });

  it('should not log for non-500 errors', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error');
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as any);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should handle non-Error exceptions (e.g. thrown string)', () => {
    filter.catch('some string error', mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const body = mockJson.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
