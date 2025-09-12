/**
 * Custom ApiError class for consistent error handling
 */
export class ApiError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;

    // This is necessary for proper prototype chain in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

