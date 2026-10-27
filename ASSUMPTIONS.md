# Architectural & Domain Assumptions

This document outlines the design decisions, financial domain constraints, and technical assumptions adopted in the implementation of the **Transaction Ledger REST API**.

---

## 1. Account Lifecycle & Balances

### 1.1 Zero-Initial Balance Policy
* **Decision**: All newly created accounts are initialized strictly with a balance of `0.00`.
* **Rationale**: In real-world banking and double-entry accounting ledgers, balances cannot materialize out of thin air upon entity creation. Accounts must be credited through an explicit, auditable funding transaction with an external reference identifier.
* **Enforcement**:
  * [src/schemas/index.ts](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/src/schemas/index.ts): The `createAccountSchema` uses `.strict()` and accepts only `{ name: string }`. Any attempt to pass `balance`, `initial_balance`, or arbitrary `id` is rejected with `400 Bad Request`.
  * [src/services/accountService.ts](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/src/services/accountService.ts): Hardcodes initial balance to `0.00`.

### 1.2 Non-Negative Balance Invariant
* **Decision**: Accounts do not support overdrafts; balance must satisfy `balance >= 0.00` at all times.
* **Rationale**: Overdraft facilities introduce complex credit risk, fee structures, and interest calculations outside the scope of a core transaction ledger.
* **Enforcement**:
  * **Application Level**: [src/services/transactionService.ts](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/src/services/transactionService.ts) and [src/services/transferService.ts](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/src/services/transferService.ts) check `if (currentBalance < amount)` before applying any debit.
  * **Database Level**: Schema contains `CHECK (balance >= 0.00)` on the `accounts` table. If any concurrent race were to attempt to reduce balance below 0, PostgreSQL rejects the update with an integrity error.

---

## 2. Currency, Precision & Arithmetic

### 2.1 Currency Domain
* **Decision**: Single currency domain is assumed across all accounts (e.g., USD or EUR).
* **Rationale**: Multi-currency ledgers require live foreign-exchange rates, spread margins, and currency pairing configurations.

### 2.2 Numerical Precision (Eliminating Floating-Point Drift)
* **Decision**: Storage uses PostgreSQL `NUMERIC(15, 2)` and validation rejects numbers with $> 2$ decimal places.
* **Rationale**: Standard IEEE 754 floating-point numbers in JavaScript suffer from binary representation errors (e.g., `0.1 + 0.2 = 0.30000000000000004`).
* **Enforcement**:
  * Zod schemas enforce `.positive()` and `Math.round(val * 100) / 100 === Number(val.toFixed(2))`.
  * Database fields for `balance` and `amount` use `NUMERIC(15, 2)`.

---

## 3. Idempotency & Deduplication

### 3.1 Account-Scoped Transaction Reference Idempotency
* **Decision**: Every transaction requires a client-supplied `reference_id` that must be unique per account.
* **Rationale**: In distributed networks, client timeouts or retried HTTP requests often lead to duplicated financial transactions ("double charging"). By enforcing idempotency via a unique reference ID, repeated network requests can safely fail or return without modifying balances.
* **Enforcement**:
  * PostgreSQL table constraint: `UNIQUE (account_id, reference_id)` on `transactions`.
  * If a duplicate `reference_id` is submitted for the same account, the system catches error `23505` and returns `409 Conflict (DUPLICATE_REFERENCE_ID)`.

### 3.2 Globally Unique Transfer Reference
* **Decision**: `reference_id` in `/transfers` is globally unique across the entire `transfers` table.
* **Enforcement**:
  * PostgreSQL table constraint: `UNIQUE (reference_id)` on `transfers`.

---

## 4. Double-Entry Transfer Model

### 4.1 Two-Legged Transaction Ledger
* **Decision**: An inter-account transfer is not merely a balance transfer; it generates two atomic ledger entries:
  1. A `debit` transaction on the source account with reference `TR-OUT-<reference_id>`.
  2. A `credit` transaction on the destination account with reference `TR-IN-<reference_id>`.
  3. A parent `transfers` record referencing both transaction IDs.
* **Rationale**: Maintains an immutable audit trail for both account holders and ensures ledger history reconciles exactly with account balances.

### 4.2 Rejection of Self-Transfers
* **Decision**: Transfers where `source_account_id === destination_account_id` are strictly prohibited and rejected with `400 Bad Request (INVALID_TRANSFER_SELF)`.

---

## 5. Concurrency Control & Deadlock Prevention

### 5.1 Pessimistic Row Locking (`FOR UPDATE`)
* **Decision**: Write operations lock the respective account rows using PostgreSQL `SELECT ... FOR UPDATE` within an active transaction block (`runTransaction`).
* **Rationale**: Prevents dirty reads, non-repeatable reads, and lost updates when multiple concurrent requests hit the same account simultaneously.

### 5.2 Deterministic Locking Sequence (Preventing Deadlocks)
* **Problem**: If Account A attempts to transfer to Account B, while Account B simultaneously attempts to transfer to Account A:
  * Thread 1 locks Account A and waits for Account B.
  * Thread 2 locks Account B and waits for Account A.
  * Result: Classic circular wait deadlock.
* **Solution**: In [src/services/transferService.ts](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/src/services/transferService.ts), account IDs are always sorted lexicographically prior to locking:
  ```typescript
  const [firstId, secondId] = [sourceAccountId, destinationAccountId].sort();
  await client.query('SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE', [firstId]);
  await client.query('SELECT id, balance FROM accounts WHERE id = $2 FOR UPDATE', [secondId]);
  ```
  Both threads acquire locks in the exact same order, mathematically eliminating the possibility of circular wait deadlocks.

---

## 6. Auditability & Immutability

### 6.1 Append-Only Ledger
* **Decision**: The API exposes no endpoints to `UPDATE` or `DELETE` existing transactions or transfers.
* **Rationale**: Core accounting ledgers must remain strictly immutable for financial compliance and auditability. Any corrections must be introduced via compensating credit or debit entries.

### 6.2 Timestamping
* **Decision**: All entities record ISO 8601 UTC timestamps (`created_at`) generated at transaction commit time.

---

## 7. Pagination & History Retrieval

### 7.1 Latest-First Ordering
* **Decision**: Transaction history is sorted chronologically latest-first (`ORDER BY created_at DESC`).
* **Rationale**: Users and accounting auditors almost universally inspect recent ledger activity first.

### 7.2 Safety Limits
* **Decision**: Pagination defaults to 10 records per page, with a hard maximum of 100 records per page.
* **Rationale**: Prevents unbounded memory consumption and database query denial-of-service from excessive page sizes.
