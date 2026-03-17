import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
    email: z.string().email().optional(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should pass through valid data unchanged', () => {
    const input = { name: 'John', age: 25, email: 'john@test.com' };
    const result = pipe.transform(input);
    expect(result).toEqual(input);
  });

  it('should return transformed data with coerced values', () => {
    const input = { name: 'John', age: '30' };
    const result = pipe.transform(input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should strip unknown fields', () => {
    const input = { name: 'John', age: 25, unknown: 'field' };
    const result = pipe.transform(input);
    expect(result).not.toHaveProperty('unknown');
  });

  it('should handle optional fields being absent', () => {
    const input = { name: 'John', age: 25 };
    const result = pipe.transform(input);
    expect(result).toEqual({ name: 'John', age: 25 });
  });

  it('should throw BadRequestException for invalid data', () => {
    const input = { name: '', age: -1 };
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('should include field-level errors in the exception', () => {
    const input = { name: '', age: 'not-a-number' };
    try {
      pipe.transform(input);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(response).toHaveProperty('message', 'Validation failed');
      expect(response).toHaveProperty('errors');
    }
  });

  it('should throw for completely wrong input type', () => {
    expect(() => pipe.transform('not-an-object')).toThrow(BadRequestException);
  });

  it('should work with a simple string schema', () => {
    const stringPipe = new ZodValidationPipe(z.string().min(3));
    expect(stringPipe.transform('hello')).toBe('hello');
    expect(() => stringPipe.transform('ab')).toThrow(BadRequestException);
  });
});
