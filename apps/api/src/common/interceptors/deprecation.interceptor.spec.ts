import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeprecationInterceptor } from './deprecation.interceptor';
import { DEPRECATED_KEY } from '../decorators/deprecated.decorator';

describe('DeprecationInterceptor', () => {
  let interceptor: DeprecationInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new DeprecationInterceptor(reflector);
  });

  function mockContext(meta: any, setHeader: jest.Mock): ExecutionContext {
    jest.spyOn(reflector, 'get').mockReturnValue(meta);
    return {
      getHandler: () => (function handler() {}),
      switchToHttp: () => ({
        getResponse: () => ({ setHeader }),
      }),
    } as any;
  }

  const mockNext: CallHandler = { handle: () => of('ok') } as any;

  it('sets Deprecation headers when handler is decorated', (done) => {
    const setHeader = jest.fn();
    const ctx = mockContext(
      { version: 'v1', message: 'Use /v2', removedInVersion: 'v2' },
      setHeader,
    );
    interceptor.intercept(ctx, mockNext).subscribe((v) => {
      expect(v).toBe('ok');
      expect(setHeader).toHaveBeenCalledWith('Deprecation', 'true');
      expect(setHeader).toHaveBeenCalledWith('Deprecation-Version', 'v1');
      expect(setHeader).toHaveBeenCalledWith('Sunset', 'v2');
      done();
    });
  });

  it('passes through when not deprecated', (done) => {
    const setHeader = jest.fn();
    const ctx = mockContext(undefined, setHeader);
    interceptor.intercept(ctx, mockNext).subscribe((v) => {
      expect(v).toBe('ok');
      expect(setHeader).not.toHaveBeenCalled();
      done();
    });
  });

  it('exposes DEPRECATED_KEY metadata', () => {
    expect(DEPRECATED_KEY).toBe('deprecated');
  });
});
