import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/connection.js';
import { Account } from '../types/index.js';
import { NotFoundError } from '../errors/AppError.js';

export class AccountService {
  /**
   * Create a new account with guaranteed initial balance of 0.
   */
  public static async createAccount(name: string): Promise<Account> {
    const pool = getPool();
    const id = uuidv4();
    const balance = 0.0;
    const createdAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO accounts (id, name, balance, created_at)
       VALUES ($1, $2, $3, $4)`,
      [id, name.trim(), balance, createdAt]
    );

    return {
      id,
      name: name.trim(),
      balance,
      created_at: createdAt,
    };
  }

  /**
   * Fetch an account by its unique identifier.
   */
  public static async getAccountById(id: string): Promise<Account> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, balance, created_at
       FROM accounts
       WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundError(`Account with id '${id}' was not found.`, 'ACCOUNT_NOT_FOUND');
    }

    return {
      id: row.id,
      name: row.name,
      balance: parseFloat(row.balance),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  /**
   * Fetch the current balance of an account.
   */
  public static async getAccountBalance(id: string): Promise<{ account_id: string; balance: number; name: string }> {
    const account = await this.getAccountById(id);
    return {
      account_id: account.id,
      balance: account.balance,
      name: account.name,
    };
  }
}
