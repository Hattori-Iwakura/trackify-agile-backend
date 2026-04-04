import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRoleGuard } from './global-role.guard';

describe('GlobalRoleGuard', () => {
  let guard: GlobalRoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new GlobalRoleGuard(reflector);
  });

  function createMockContext(user: any) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ id: 'user-1', role: 'USER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow ADMIN when ADMIN role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny USER when ADMIN role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'USER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny when user has no role property', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ id: 'user-1' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow when roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext({ id: 'user-1', role: 'USER' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
