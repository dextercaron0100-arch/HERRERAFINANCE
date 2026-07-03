# Run and deploy Herrera Finance

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set the required environment variables.
   - `GEMINI_API_KEY` if you use Gemini AI features
   - `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` for the PostgreSQL database
3. Run the app:
   `npm run dev`
4. If you want to remove seeded cash accounts after `.env` is configured, run:
   `npm run remove-seed-cash-accounts`
