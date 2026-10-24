# MiniLedger

MiniLedger is a small full-stack app for keeping track of money you lend to friends. It is deliberately built with straightforward code so a beginner can walk through the implementation in an interview.

## Features

- Phone number login with a mock six-digit OTP printed in the backend terminal
- JWT-based authentication for API requests
- Add a loan with a friend's name, amount in INR, and due date
- Mark an unpaid loan as repaid
- Summary for total lent, total repaid, and overdue amount
- Overdue entries highlighted in the React Native app
- Basic input validation and backend unit tests
- PostgreSQL data persists between restarts

**Not included:** receipt photo upload is an optional bonus and has been left out of this first version to keep the app easier to explain and debug.

## Tech stack

- Backend: Node.js, Express, TypeScript, PostgreSQL, `pg`, JWT
- App: React Native, Expo, TypeScript
- Database for local development: PostgreSQL through Docker Compose

## Requirements

Install these before starting:

1. Node.js 22.13 or newer (SDK 58 requirement; a current supported release is recommended)
2. npm (comes with Node.js)
3. Docker Desktop, running
4. Expo Go on your phone, or an iOS/Android simulator
5. VS Code

## 1. Open the project

Extract the project ZIP, then open the **`miniledger`** folder itself in VS Code. The root folder contains `backend`, `mobile`, and `docker-compose.yml`.

## 2. Start PostgreSQL

Open a VS Code terminal in the project root:

```bash
docker compose up -d db
```

Check that the database is running:

```bash
docker compose ps
```

The database is named `miniledger`. On its first initialization, Docker runs `backend/sql/schema.sql` to create the `users` and `loans` tables.

## 3. Start the backend

Open a **second** VS Code terminal:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Keep that terminal open. You should see a message that the API connected to PostgreSQL and is running at `http://localhost:4000`.

Check the health endpoint in your browser:

`http://localhost:4000/api/health`

It should return JSON similar to:

```json
{"status":"ok","app":"MiniLedger API"}
```

When you request an OTP from the app, the code appears in this backend terminal. That is intentional for this assignment; no SMS is sent.

## 4. Start the React Native app

Open a **third** VS Code terminal:

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Use the Expo terminal's shortcut to open a simulator, or scan the QR code with Expo Go if you are using a physical phone.

### Important: choosing the API URL

The app must be able to reach the backend computer.

- **iOS simulator on the same Mac:** use `http://localhost:4000/api`.
- **Android emulator:** edit `mobile/.env` to `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api`.
- **A physical phone:** put the Mac/PC's local network IP in `mobile/.env`, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api`. Replace the example IP with your computer's actual LAN IP. Both devices need to be on the same Wi-Fi, and your firewall must allow the connection.

After changing `mobile/.env`, restart Expo so it reloads the environment variable. Do not put a real password or secret in a `EXPO_PUBLIC_` variable; values with that prefix are bundled into the app.

## 5. Try the app

1. Enter a phone number, for example `9876543210`, and press **Send mock OTP**.
2. Look at the backend terminal. Find a line like `[MiniLedger] Mock OTP for 9876543210: 482193`.
3. Enter those six digits in the app and choose **Verify and continue**.
4. Press **Add entry**, then enter a friend, amount, and date in `YYYY-MM-DD` format.
5. To demonstrate an overdue entry, use a date before today. The amount should be highlighted as overdue.
6. Add another entry with a future due date, then press **Mark repaid** and confirm. The summary should update.
7. Pull down on the list to refresh.

You can use any valid test phone number. The login is only a mock authentication flow and does not send a real OTP.

## 6. Run backend tests and build

From the backend folder:

```bash
npm test
npm run build
```

`npm test` runs the simple unit tests for phone, amount, date, and overdue validation. `npm run build` checks the TypeScript backend and writes JavaScript into `backend/dist`.

## API overview

All loan endpoints require the token returned from `/api/auth/verify-otp` in this header:

`Authorization: Bearer YOUR_TOKEN`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check whether the API is running |
| `POST` | `/api/auth/send-otp` | Generate and log a mock OTP; JSON body: `{ "phone": "9876543210" }` |
| `POST` | `/api/auth/verify-otp` | Verify `{ "phone": "9876543210", "otp": "123456" }` and return a token |
| `GET` | `/api/loans` | List the signed-in user's entries |
| `GET` | `/api/loans/summary` | Return totals for lent, repaid, and overdue amounts |
| `POST` | `/api/loans` | Add `{ "friendName": "Rahul", "amount": 1500, "dueDate": "2026-11-05" }` |
| `PATCH` | `/api/loans/1/repay` | Mark loan ID `1` as repaid |

### What the summary means

- **Total lent:** the sum of all loan entries, including entries later marked as repaid. This measures the total amount originally recorded as lent.
- **Total repaid:** the sum of entries that have been marked as repaid.
- **Overdue amount:** the sum of unpaid entries whose due date is before today's database date.

These totals are not a bank balance. They are a simple overview of the recorded loans.

## Project structure

```text
miniledger/
├── backend/
│   ├── sql/schema.sql                # Tables and indexes
│   ├── src/
│   │   ├── middleware/requireAuth.ts # Protects loan APIs
│   │   ├── routes/auth.routes.ts     # Mock OTP and token creation
│   │   ├── routes/loans.routes.ts    # Loan CRUD-style actions and summary
│   │   ├── app.ts                    # Express app and routes
│   │   ├── db.ts                     # PostgreSQL connection pool
│   │   ├── otpStore.ts                # Temporary in-memory OTP storage
│   │   ├── server.ts                  # Starts the API
│   │   ├── types.ts                   # TypeScript request type
│   │   └── utils.ts                   # Reusable validators
│   ├── tests/utils.test.ts            # Basic validation tests
│   └── .env.example                   # Local backend config template
├── mobile/
│   ├── src/components/
│   │   ├── LoginScreen.tsx            # Phone and OTP screen
│   │   ├── DashboardScreen.tsx        # Summary and loan list
│   │   └── AddLoanModal.tsx           # Add-entry form
│   ├── src/api.ts                     # App-to-backend requests
│   ├── src/types.ts                   # API response types
│   ├── App.tsx                        # Chooses login or dashboard
│   └── .env.example                   # Backend URL template
├── docker-compose.yml
├── EXPLAIN_CODE.md                    # Beginner's walkthrough
└── README.md
```


## Known demo limitations

- OTPs are mock values printed in the backend terminal; this does not send SMS.
- OTPs are held in memory and disappear when the backend restarts.
- The JWT is kept in app memory, so logging out or restarting the app returns to the login screen.
- The included database credentials and JWT secret are local-development examples. Replace them for a deployed app.
- This is an internship assignment/demo, not production-ready authentication or financial software.
