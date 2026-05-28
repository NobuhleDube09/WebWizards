

# CampusConnect

South Africa's student marketplace. Buy and sell skills, services, and talent — all on campus.

---

## Admin Account

| Field    | Value                          |
|----------|-------------------------------|
| Email    | admin@campus-connect.co.za    |
| Password | Campus@2026                   |
| Role     | `is_admin = true`             |
| URL      | `/pages/login.html`           |

> **To seed the admin account**, run:
> ```bash
> node scripts/seed-admin.js
> ```
> This script creates the Supabase Auth user and profile row. It is idempotent — safe to run multiple times.

---

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase and other keys.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Apply the database schema in the Supabase SQL Editor:
   ```
   supabase-schema.sql
   ```
4. Seed the admin account:
   ```bash
   node scripts/seed-admin.js
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

---

## Notes

- Payments are intentionally excluded for now.
- Admin access depends on `is_admin=true` for a user in the `users` table.
- The AI matching endpoint expects a valid Claude API key and model access or we choose to use OpenAI or Gemini API.
