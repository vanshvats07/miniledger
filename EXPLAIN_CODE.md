# MiniLedger — Beginner-Friendly Code Walkthrough

Read this file while the project is open in VS Code. The goal is to understand the code, not to memorise it. Start with the overall request flow, then open each file and relate it to the explanation.

## 1. The app in one minute

MiniLedger has three pieces:

1. **React Native app:** the screens the user taps.
2. **Express API:** checks requests, validates values, verifies the login token, and runs SQL queries.
3. **PostgreSQL:** permanently stores registered phone numbers and loan entries.

The mobile app does not connect directly to PostgreSQL. It calls the API with HTTP. The API is the only part that talks to the database.

## 2. How login works

1. On `LoginScreen.tsx`, the user types a phone number and taps **Send mock OTP**.
2. `mobile/src/api.ts` sends a `POST` request to `/api/auth/send-otp`.
3. `backend/src/routes/auth.routes.ts` validates the phone number, generates six random digits, stores them in the server's temporary `otpStore`, and prints them in the terminal.
4. The user reads those digits from the terminal and types them into the app.
5. The app calls `/api/auth/verify-otp` with the phone number and OTP.
6. The backend checks that the saved OTP exists, has not expired, and matches. It deletes the code so it cannot be used again.
7. The backend creates a user if that phone number has not logged in before, then signs a JWT.
8. `App.tsx` keeps the returned token in state and displays the dashboard.

**What is a JWT?** It is a signed token that the app sends to prove which user made a request. It is not the user's phone number or password. The backend verifies the signature before allowing access to a loan endpoint.

## 3. Backend files

### `backend/src/server.ts`

This is the entry point. It loads `.env`, checks that the database URL and JWT secret are configured, tests the database connection, then starts Express listening on port 4000. If the database is unavailable, it prints the error instead of pretending the server started correctly.

### `backend/src/app.ts`

This creates the Express application. `express.json()` lets Express read incoming JSON request bodies. The health route is a quick way to check the API. The auth and loan routers group related endpoints. The final error handler gives unexpected failures a consistent message.

### `backend/src/db.ts`

`Pool` is a collection of reusable PostgreSQL connections. Instead of opening and closing a brand-new database connection for every request, the API borrows a connection from the pool as needed.

### `backend/sql/schema.sql`

This file creates two tables:

- `users`: one row for each phone number.
- `loans`: each loan belongs to a user through `user_id`.

`NUMERIC(12, 2)` stores money with two decimal places. `CHECK (amount > 0)` is a second line of defence against invalid amounts. A foreign key connects the loan to its owner. Indexes help PostgreSQL search loans for a particular user and order them by due date.

### `backend/src/otpStore.ts`

This is a small in-memory `Map`. A map associates one phone number with its OTP and expiry time. It keeps the demo short, but the OTP disappears when the server restarts. A production system would need a more robust, rate-limited authentication flow and usually an actual SMS provider.

### `backend/src/routes/auth.routes.ts`

This file implements the two authentication endpoints. `randomInt()` creates a six-digit code. `Date.now()` is used to enforce the five-minute expiry. The SQL `ON CONFLICT` clause means repeated logins with the same phone number reuse the existing user instead of creating duplicates. `jwt.sign()` makes the token, and the secret comes from the backend `.env` file.

### `backend/src/middleware/requireAuth.ts`

Middleware is code that runs before the protected route. It reads `Authorization: Bearer <token>`, verifies the JWT, extracts the user ID, and attaches it to the request. If a token is missing or invalid, the request is rejected with HTTP 401.

### `backend/src/routes/loans.routes.ts`

This file contains the main business logic:

- `GET /api/loans` lists the signed-in user's entries.
- `GET /api/loans/summary` asks PostgreSQL to calculate all three totals.
- `POST /api/loans` validates and inserts a new entry.
- `PATCH /api/loans/:id/repay` marks one unpaid entry as repaid.

Every loan query includes the authenticated `userId`. That is important: a user must not be able to see or change another person's records just by guessing a loan ID.

### Why do SQL queries use `$1`, `$2`, and `$3`?

They are placeholders for values supplied separately to `pool.query()`. For example:

```ts
await pool.query(
  "SELECT id FROM users WHERE phone = $1",
  [phone],
);
```

The phone number is sent as a parameter instead of being joined into the SQL string. This helps prevent SQL injection. Do not replace it with string concatenation.

### `backend/src/utils.ts`

Small validation functions live in one place so that the routes stay readable and the functions can be tested. `isValidDate()` does more than check the shape of the date: it also rejects impossible calendar dates such as February 31.

### `backend/tests/utils.test.ts`

These tests cover the helper functions with valid and invalid values. They are small unit tests: they do not start Express or require a database.

## 4. Mobile app files

### `mobile/App.tsx`

`useState` stores the token. If the token is `null`, React shows the login screen. After a successful login, the token exists and React shows the dashboard. Logging out sets it back to `null`.

### `mobile/src/components/LoginScreen.tsx`

Each `useState` call stores one small piece of screen state, such as the phone number, OTP, loading state, or error message. When a user types, `onChangeText` updates that state. Pressing the button runs an async function that calls the API and shows a useful message if the request fails.

### `mobile/src/api.ts`

This is the one place that sends HTTP requests. The generic `request<T>()` helper handles the base URL, JSON, optional bearer token, and readable errors. The other exported functions are short wrappers for the specific endpoints. If the API's address changes, update `mobile/.env` instead of editing every screen.

`EXPO_PUBLIC_API_URL` is intentionally public app configuration, not a secret. Never put passwords, database credentials, or JWT signing secrets in a variable starting with `EXPO_PUBLIC_`.

### `mobile/src/components/DashboardScreen.tsx`

When the dashboard opens, `useEffect` runs `loadDashboard()`. That function gets the entries and summary in parallel with `Promise.all()`. The returned values are stored using `setLoans()` and `setSummary()`, so React redraws the screen with the latest data.

A loan is overdue when it is not repaid and its due date is earlier than today's local date. The UI uses a pale red card and red status label to call attention to it. The database separately calculates the summary; the backend is the source for the summary figures.

When **Mark repaid** is pressed, an `Alert` asks for confirmation. The app calls the PATCH endpoint, then reloads the entries and totals.

### `mobile/src/components/AddLoanModal.tsx`

This file contains the add-entry form. It performs quick checks before sending the request: the name must not be blank, the amount must be greater than zero, and the date must look like `YYYY-MM-DD`. The backend repeats important validation because clients cannot be trusted to validate every request.

The modal calls `addLoan()`. When the API saves the entry, it closes and asks the dashboard to reload. This keeps the data flow easy to follow.

## 5. The summary SQL in plain English

The summary uses PostgreSQL `SUM()` to add amounts. `CASE WHEN is_repaid = TRUE THEN amount ELSE 0 END` adds an amount only when the entry is marked as repaid. Another `CASE` adds an amount only when it is unpaid and its due date is before `CURRENT_DATE`.

`COALESCE(..., 0)` means an empty ledger returns `0`, not `NULL`. Without it, a sum over no matching rows can be `NULL`.

In this app, **total lent includes repaid entries**, because it represents the total value of all recorded original loans. **Total repaid** and **overdue amount** are separate views of those entries, so the figures should not be added together.

## 6. Important TypeScript syntax

- `type Loan = { ... }` defines the shape of a loan object. It helps the editor catch misspelled fields and type mistakes.
- `Promise<Loan[]>` means an async function eventually returns an array of loans.
- `async` and `await` make asynchronous HTTP/database work easier to read. `await` pauses that function until the promise finishes; it does not freeze the whole server.
- `try/catch/finally` lets the app show errors while ensuring loading state is reset in `finally`.
- `req`, `res`, and `next` are the Express request, response, and error-forwarding function.
- `?` optional chaining, as in `req.body?.phone`, avoids an immediate property-access error if a value is missing.
- `Number(...)` converts a text field like `"1500"` into a number. The code still checks the result before saving.

## 7. Interview questions you should practise

**Q: Why use Express?**  
Express makes it easy to define HTTP endpoints, read request bodies, use authentication middleware, and send JSON responses without writing a server from scratch.

**Q: Why PostgreSQL?**  
Loan entries are structured records with a clear relationship to a user. PostgreSQL supports foreign keys, constraints, reliable transactions, and aggregation queries for the summary.

**Q: Why store the user ID on each loan?**  
It associates each entry with its owner and lets every query restrict access to the signed-in user's records.

**Q: Is the OTP production-ready?**  
No. It is deliberately mocked and printed in the terminal for this assignment. Real authentication needs an SMS provider or another verified channel, rate limiting, abuse protection, secure secret management, and monitoring.

**Q: What happens when an entry is repaid?**  
The API sets `is_repaid = TRUE` and `repaid_at = NOW()`. It doesn't delete the entry, so the history and total-lent figure remain available.

**Q: How does the mobile app talk to the API?**  
The helper functions in `api.ts` send HTTP requests. After login, protected requests include the JWT in the `Authorization` header. The backend middleware checks it.

**Q: What would you improve with more time?**  
Add integration tests for the endpoints, persistent and rate-limited OTP storage, secure token storage, receipt upload, pagination/search, and deployment configuration. I would also add stricter date parsing and clearer accessibility labels.

## 8. How to learn this code without getting overwhelmed

1. Run the database and backend before starting the app.
2. Read `App.tsx`, then `LoginScreen.tsx`, and follow the login API into `auth.routes.ts`.
3. Read `api.ts`, then trace **Add entry** from `AddLoanModal.tsx` to the POST handler and SQL insert.
4. Trace **Mark repaid** into the PATCH handler.
5. Read the summary SQL last and explain each `SUM`, `CASE`, and `COALESCE` aloud.
6. Run the tests, change one validation rule, and add one test of your own. This is a good check that you understand the code rather than only recognising it.
