import type { ApiErrorCodes } from './ApiError';
import ApiError from './ApiError';

export default class ApiUnauthorizedError extends ApiError {
  constructor(message: string, code: ApiErrorCodes, payload?: any) {
    super(message, code, payload);
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, ApiUnauthorizedError);
  }
}
