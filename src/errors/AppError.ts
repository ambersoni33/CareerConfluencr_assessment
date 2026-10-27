export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND', details?: unknown) {
    super(message, 404, code, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: string = 'BAD_REQUEST', details?: unknown) {
    super(message, 400, code, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(currentBalance: number, requestedAmount: number) {
    super(
      `Insufficient balance. Current balance is ${currentBalance.toFixed(2)}, but requested debit is ${requestedAmount.toFixed(2)}.`,
      400,
      'INSUFFICIENT_BALANCE',
      { current_balance: currentBalance, requested_amount: requestedAmount }
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}

export class DuplicateReferenceError extends ConflictError {
  constructor(referenceId: string, accountId?: string) {
    const msg = accountId
      ? `Transaction with reference_id '${referenceId}' already exists for account '${accountId}'.`
      : `Transaction or transfer with reference_id '${referenceId}' already exists.`;
    super(msg, 'DUPLICATE_REFERENCE_ID', { reference_id: referenceId, account_id: accountId });
  }
}
