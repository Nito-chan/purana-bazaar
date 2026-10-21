export class ApiError extends Error {
  constructor(code, message, messageKey = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.messageKey = messageKey;
  }
}

export function authRequired() {
  return new ApiError('AUTH_REQUIRED', 'Sign in to continue.', 'errors.authRequired');
}

export function notFound(message = 'Not found.') {
  return new ApiError('NOT_FOUND', message, 'errors.notFound');
}

export function forbidden(message = 'You do not have permission to do that.') {
  return new ApiError('FORBIDDEN', message);
}
