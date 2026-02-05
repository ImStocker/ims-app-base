export default class ApiError extends Error {
  code: ApiErrorCodes;
  originalMessage: string;
  payload: any;

  constructor(message: string, code: ApiErrorCodes, payload: any) {
    const originalMessage = message;
    if (!message) message = `Error ${code}`;
    super(message);
    this.code = code;
    this.originalMessage = originalMessage;
    this.payload = payload;
    if (Error.captureStackTrace) Error.captureStackTrace(this, ApiError);
  }
}

export enum ApiErrorCodes {
  PARAM_EMPTY = 'PARAM_EMPTY',
  PARAM_TOO_SHORT = 'PARAM_TOO_SHORT',
  PARAM_TOO_LONG = 'PARAM_TOO_LONG',
  PARAM_BAD_FORMAT = 'PARAM_BAD_FORMAT',
  PARAM_BAD_VALUE = 'PARAM_BAD_VALUE',
  ENTITY_ALREADY_EXISTS = 'ENTITY_ALREADY_EXISTS',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  ENTITY_NOT_AVAILABLE = 'ENTITY_NOT_AVAILABLE',
  ACTION_NOT_AVAILABLE = 'ACTION_NOT_AVAILABLE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  HAS_NO_LICENSE = 'HAS_NO_LICENSE',
  API_FLOOD = 'API_FLOOD',
  SERVER_ERROR = 'SERVER_ERROR',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  FILE_EXPIRED = 'FILE_EXPIRED',
}
