/** Application error carrying an HTTP status and a stable machine code. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (msg: string, code = 'bad_request'): ApiError =>
  new ApiError(400, code, msg);
export const unauthorized = (msg = 'Authentication required', code = 'unauthorized'): ApiError =>
  new ApiError(401, code, msg);
export const forbidden = (msg = 'Insufficient scope', code = 'forbidden'): ApiError =>
  new ApiError(403, code, msg);
export const notFound = (msg = 'Resource not found', code = 'not_found'): ApiError =>
  new ApiError(404, code, msg);
export const conflict = (msg: string, code = 'conflict'): ApiError => new ApiError(409, code, msg);
