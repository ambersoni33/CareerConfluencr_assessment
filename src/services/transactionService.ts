import { v4 as uuidv4 } from 'uuid';
import { getPool, runTransaction } from '../db/connection.js';
import { PaginationResult, Transaction, TransactionType } from '../types/index.js';
import {
  NotFoundError,
  InsufficientBalanceError,
  DuplicateReferenceError,
  BadRequestError,
} from '../errors/AppError.js';

export interface AddTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  referenceId: string;
}

export interface GetTransactionsOptions {
  accountId: string;
  type?: TransactionType;
  page: number;
  limit: number;
}

export class TransactionService {
  /**
   * Atomically executes a credit or debit transaction on an account.
   * If any step fails or duplicate reference_id exists, rolls back completely.
   */
  public static async addTransaction(input: AddTransactionInput): Promise<Transaction> {
    const { accountId, type, amount, description = '', referenceId } = input;

    return runTransaction(async (client) => {
      // 1. Verify account exists and lock row with FOR UPDATE
      const accountRes = await client.query(
        'SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );
      const account = accountRes.rows[0];

      if (!account) {
        throw new NotFoundError(`Account with id '${accountId}' was not found.`, 'ACCOUNT_NOT_FOUND');
      }

      const currentBalance = parseFloat(account.balance);

      // 2. Check for duplicate reference_id within this account
      const checkDupRes = await client.query(
        'SELECT id FROM transactions WHERE account_id = $1 AND reference_id = $2',
        [accountId, referenceId]
      );
      if (checkDupRes.rows.length > 0) {
        throw new DuplicateReferenceError(referenceId, accountId);
      }

      // 3. Compute new balance and check sufficient balance for debit
      let newBalance: number;
      if (type === 'credit') {
        newBalance = Math.round((currentBalance + amount) * 100) / 100;
      } else if (type === 'debit') {
        if (currentBalance < amount) {
          throw new InsufficientBalanceError(currentBalance, amount);
        }
        newBalance = Math.round((currentBalance - amount) * 100) / 100;
      } else {
        throw new BadRequestError(`Invalid transaction type '${type}'. Supported types are 'credit' and 'debit'.`, 'INVALID_TRANSACTION_TYPE');
      }

      // 4. Update account balance
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accountId]);

      // 5. Insert immutable transaction log
      const txId = uuidv4();
      const createdAt = new Date().toISOString();

      try {
        await client.query(
          `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [txId, accountId, type, amount, description, referenceId, createdAt]
        );
      } catch (err: unknown) {
        const pgErr = err as { code?: string; message?: string };
        if (pgErr.code === '23505') {
          throw new DuplicateReferenceError(referenceId, accountId);
        }
        throw err;
      }

      return {
        id: txId,
        account_id: accountId,
        type,
        amount,
        description,
        reference_id: referenceId,
        created_at: createdAt,
      };
    });
  }

  /**
   * Fetch transaction history for an account with type filtering, pagination, and latest-first sorting.
   */
  public static async getTransactions(options: GetTransactionsOptions): Promise<PaginationResult<Transaction>> {
    const { accountId, type, page, limit } = options;
    const pool = getPool();

    // Verify account existence first
    const accountRes = await pool.query('SELECT id FROM accounts WHERE id = $1', [accountId]);
    if (accountRes.rows.length === 0) {
      throw new NotFoundError(`Account with id '${accountId}' was not found.`, 'ACCOUNT_NOT_FOUND');
    }

    // Build query conditions
    const whereClauses: string[] = ['account_id = $1'];
    const queryParams: (string | number)[] = [accountId];

    if (type) {
      queryParams.push(type);
      whereClauses.push(`type = $${queryParams.length}`);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total records count
    const countRes = await pool.query(`SELECT COUNT(*) as total FROM transactions WHERE ${whereSql}`, queryParams);
    const totalRecords = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    // Fetch paginated transactions sorted latest-first
    const offset = (page - 1) * limit;
    const dataParams = [...queryParams, limit, offset];
    const limitPlaceholder = `$${queryParams.length + 1}`;
    const offsetPlaceholder = `$${queryParams.length + 2}`;

    const queryRes = await pool.query(
      `SELECT id, account_id, type, amount, description, reference_id, created_at
       FROM transactions
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      dataParams
    );

    const transactions: Transaction[] = queryRes.rows.map((r) => ({
      id: r.id,
      account_id: r.account_id,
      type: r.type,
      amount: parseFloat(r.amount),
      description: r.description,
      reference_id: r.reference_id,
      created_at: new Date(r.created_at).toISOString(),
    }));

    return {
      current_page: page,
      page_size: limit,
      total_records: totalRecords,
      total_pages: totalPages,
      transactions,
    };
  }
}
