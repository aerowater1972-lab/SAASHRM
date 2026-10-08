import { SetMetadata } from '@nestjs/common';

export const DEPRECATED_KEY = 'deprecated';
export const Deprecated = (options?: {
  version?: string;
  message?: string;
  removedInVersion?: string;
}) => SetMetadata(DEPRECATED_KEY, options || {});