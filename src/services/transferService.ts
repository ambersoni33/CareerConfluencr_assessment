import { v4 as uuidv4 } from 'uuid';
import { runTransaction } from '../db/connection.js';
import { Transfer } from '../types/index.js';
import {
  BadRequestError,
  NotFoundError,
  InsufficientBalanceError,
  DuplicateReferenceError,
} from '../errors/AppError.js';

export interface TransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  referenceId: string;
  description?: string;
}

export class TransferService {
  /**
   * Atomically transfers money from source account to destination account.
   * Both accounts are updated and ledger transactions are recorded in a single atomic transaction.
   * If any step fails, the entire transfer is rolled back.
   */
  public static async transferMoney(input: TransferInput): Promise<Transfer> {
    const { sourceAccountId, destinationAccountId, amount, referenceId, description = '' } = input;

    if (sourceAccountId === destinationAccountId) {
      throw new BadRequestError('Source and destination accounts must be different.', 'INVALID_TRANSFER_SELF');
    }

    return runTransaction(async (client) => {
      // 1. Check if transfer with this reference_id already exists
      const checkTransferRes = await client.query('SELECT id FROM transfers WHERE reference_id = $1', [referenceId]);
      if (checkTransferRes.rows.length > 0) {
        throw new DuplicateReferenceError(referenceId);
      }

      // 2. Lock accounts in deterministic order (sorted by id) to prevent deadlocks
      const [firstId, secondId] = [sourceAccountId, destinationAccountId].sort();

      const firstRes = await client.query('SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE', [firstId]);
      const secondRes = await client.query('SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE', [secondId]);

      const firstAccount = firstRes.rows[0];
      const secondAccount = secondRes.rows[0];

      const sourceAccount = sourceAccountId === firstId ? firstAccount : secondAccount;
      const destAccount = destinationAccountId === firstId ? firstAccount : secondAccount;

      if (!sourceAccount) {
        throw new NotFoundError(`Source account with id '${sourceAccountId}' was not found.`, 'ACCOUNT_NOT_FOUND');
      }

      if (!destAccount) {
        throw new NotFoundError(`Destination account with id '${destinationAccountId}' was not found.`, 'ACCOUNT_NOT_FOUND');
      }

      const sourceBalance = parseFloat(sourceAccount.balance);
      const destBalance = parseFloat(destAccount.balance);

      // 3. Verify sufficient balance in source account
      if (sourceBalance < amount) {
        throw new InsufficientBalanceError(sourceBalance, amount);
      }

      // 4. Calculate new balances
      const newSourceBalance = Math.round((sourceBalance - amount) * 100) / 100;
      const newDestBalance = Math.round((destBalance + amount) * 100) / 100;

      // 5. Update balances
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newSourceBalance, sourceAccountId]);
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newDestBalance, destinationAccountId]);

      // 6. Record source and destination transactions
      const createdAt = new Date().toISOString();
      const transferId = uuidv4();
      const sourceTxId = uuidv4();
      const destTxId = uuidv4();

      const sourceRef = `TR-OUT-${referenceId}`;
      const destRef = `TR-IN-${referenceId}`;

      const txDescription = description.trim() || `Transfer between ${sourceAccountId} and ${destinationAccountId}`;

      await client.query(
        `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sourceTxId, sourceAccountId, 'debit', amount, `Debit: ${txDescription}`, sourceRef, createdAt]
      );

      await client.query(
        `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [destTxId, destinationAccountId, 'credit', amount, `Credit: ${txDescription}`, destRef, createdAt]
      );

      // 7. Record the transfer entity
      try {
        await client.query(
          `INSERT INTO transfers (id, source_account_id, destination_account_id, amount, reference_id, description, source_transaction_id, destination_transaction_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            transferId,
            sourceAccountId,
            destinationAccountId,
            amount,
            referenceId,
            txDescription,
            sourceTxId,
            destTxId,
            createdAt,
          ]
        );
      } catch (err: unknown) {
        const pgErr = err as { code?: string; message?: string };
        if (pgErr.code === '23505') {
          throw new DuplicateReferenceError(referenceId);
        }
        throw err;
      }

      return {
        id: transferId,
        source_account_id: sourceAccountId,
        destination_account_id: destinationAccountId,
        amount,
        reference_id: referenceId,
        description: txDescription,
        source_transaction_id: sourceTxId,
        destination_transaction_id: destTxId,
        created_at: createdAt,
      };
    });
  }
}
