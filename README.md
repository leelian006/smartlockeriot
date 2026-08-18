# PetalLock Smart Locker — Backend (Vercel + Supabase)

This is the backend for the PetalLock web app, deployed as Vercel serverless
functions (plain Node.js, no framework) backed by Supabase Postgres (data)
and Supabase Storage (payment slip images). It replaces an earlier PHP +
XAMPP/MySQL version — see `git log` if you need that history.

## 1. Setup

1. **Database**: open your Supabase project's SQL editor and run
   `sql/schema.pg.sql` once. It creates every table and seeds the two
   lockers (`L-01`, `L-02`) and the default `system_settings` row.
2. **Storage**: in Supabase Storage, create a **private** bucket named
   `slips`. Payment slip uploads go here; the admin dashboard reads them
   back through short-lived signed URLs (`api/_lib/storage.js`), not a
   public bucket URL.
3. **Vercel env vars** (Project Settings → Environment Variables):
   - `DATABASE_URL` — Supabase's **pooled** connection string (port 6543,
     `pgbouncer` transaction mode). Serverless functions open many
     short-lived connections; the direct port (5432) will exhaust
     Postgres's connection limit.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for the Storage client in
     `api/_lib/storage.js`. The service-role key is server-side only, never
     sent to the browser.
   - `JWT_SECRET` — a long random string, used to sign/verify login tokens.
   - `DEVICE_API_KEY` — a long random string. Must exactly match
     `DEVICE_KEY` in the ESP32 firmware (`petallock_esp32/petallock_esp32.ino`).
4. **Seed the first admin login**: run this once yourself, locally —
   ```
   DATABASE_URL="<your Supabase pooled connection string>" node scripts/seed-admin.js
   ```
   Creates `admin` / `admin1234`. Change the password after logging in
   (there's no "change admin password" UI yet — update it directly in the
   `admins` table, bcrypt-hashed, if needed).
5. Push this repo to GitHub and import it into Vercel (or `vercel --prod`
   from the CLI once the env vars above are set). No build step — static
   HTML/CSS/JS at the repo root, serverless functions under `api/`.

## 2. Frontend structure

Same four pages as before, now plain static HTML (no PHP, no server-side
render step — Vercel doesn't run PHP):

| File | Purpose |
|---|---|
| `index.html` | Login (both user and admin — a tab switches which) |
| `register.html` | Sign-up page |
| `user-dashboard.html` | Customer app — client-side auth guard, redirects to `index.html` if there's no valid token |
| `admin-dashboard.html` | Admin app — same guard, for admin tokens |
| `styles.css` | Shared stylesheet used by all four pages |
| `common.js` | Shared JS: the `api()`/`apiGet()`/`apiPost()` fetch helpers (now sending `Authorization: Bearer <token>` instead of a session cookie), the `requireAuthAndLoadProfile()` guard the two dashboards call on load, chat rendering, logout, terms modal |

Auth is a JWT stored in `localStorage` after `POST /api/auth/login` or
`/api/auth/admin_login`, sent back as `Authorization: Bearer <token>` on
every subsequent call. `GET /api/auth/me` is a new endpoint the two
dashboards call on load to fetch the logged-in user/admin's profile (the
PHP version got this for free from a session-bound query at page-render
time; static pages have no render step, so it's an explicit API call now).

## 3. API reference

All endpoints return JSON: `{"ok": true, ...}` or `{"ok": false, "error": "..."}`.
POST endpoints (except the slip upload) expect a **JSON body**, not
form-encoded. Same routes as before, just without the `.php` suffix.

### Auth
| Method | Endpoint | Who | Body |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | `first_name, last_name, phone, email, password` |
| POST | `/api/auth/login` | anyone | `identifier` (phone or email), `password` — returns `{token, user}` |
| POST | `/api/auth/admin_login` | anyone | `username, password` — returns `{token, admin}` |
| POST | `/api/auth/logout` | — | no server-side session to destroy; client discards its token |
| GET | `/api/auth/me` | logged in | returns the current user's or admin's profile, based on the token |
| POST | `/api/auth/update_profile` | user | `first_name, last_name, phone, email, new_password?` |

### Lockers
| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/lockers/list` | anyone |

### Rentals (user)
| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/rentals/create` | `locker_id, duration_minutes, price` |
| GET | `/api/rentals/my` | — active/expired rentals with live countdown |
| GET | `/api/rentals/history` | — past confirmed rentals |
| POST | `/api/rentals/set_pin` | `rental_id, pin` (4 digits) |
| GET | `/api/rentals/notifications` | — rejection notices to show as banners |
| POST | `/api/rentals/forgot_pin_request` | `rental_id` — generates an OTP (no SMS gateway wired up — look it up in `pin_reset_otps` for testing) |
| POST | `/api/rentals/forgot_pin_reset` | `rental_id, otp, new_pin` |
| POST | `/api/rentals/verify_and_unlock` | `rental_id, pin` — wrong PIN returns HTTP 200 `{ok:true, unlock:false}`, not a 4xx |

### Payments
| Method | Endpoint | Who | Notes |
|---|---|---|---|
| POST | `/api/payments/upload_slip` | user | **multipart/form-data**: `rental_id, kind (new/extend/penalty), duration_minutes, price, slip` (file) — uploads to Supabase Storage |
| GET | `/api/payments/pending` | admin | slip queue; each item includes a `slip_url` signed URL |
| POST | `/api/payments/confirm` | admin | `payment_id` |
| POST | `/api/payments/reject` | admin | `payment_id, reason` |

### Chat
| Method | Endpoint | Who | Body |
|---|---|---|---|
| POST | `/api/chat/send` | user | `message` |
| POST | `/api/chat/admin_send` | admin | `message, user_id` |
| GET | `/api/chat/messages` | user | — |
| GET | `/api/chat/admin_messages?user_id=` | admin | — |
| GET | `/api/chat/conversations` | admin | list of customer threads with unread counts |

### Admin
| Method | Endpoint | Body |
|---|---|---|
| GET | `/api/admin/overview` | — stats + recent activity |
| GET | `/api/admin/reports` | — revenue stats + 7-day chart data |
| GET / POST | `/api/admin/get_settings` / `update_settings` | system settings singleton |
| POST | `/api/admin/update_locker` | `locker_id, location` |
| GET | `/api/admin/users` | — |
| POST | `/api/admin/emergency_unlock` | `locker_ids: ["L-01"], reason` |

### ESP32 (device, not browser)
These use a header `X-Device-Key: <DEVICE_API_KEY>` instead of a bearer
token, since the ESP32 can't hold a login session.

| Method | Endpoint | Body / Query | Purpose |
|---|---|---|---|
| GET | `/api/esp32/poll?locker_id=L-01` | — | ESP32 calls every few seconds; returns `{unlock: true}` once when a command is waiting |
| POST | `/api/esp32/verify_pin` | `locker_id, pin` | ESP32 sends what was typed on the Keypad 4x4; locks out for 5 minutes after 5 wrong attempts |
| POST | `/api/esp32/door_status` | `locker_id, door_closed (bool)` | ESP32 reports MC-38 state on change/heartbeat |
| GET | `/api/esp32/check_locker?locker_id=L-01` | — | optional — lets the firmware show "overtime" before prompting for a PIN it knows will fail; not currently called by the firmware |

## 4. Security notes

- Passwords and locker PINs are stored with bcrypt (`bcryptjs`) — never in
  plaintext.
- Keypad/web PIN attempts are rate-limited (5 wrong tries → 5 min lockout).
- All SQL uses parameterized queries via `pg` (no string-concatenated
  queries).
- The ESP32 endpoints require a shared secret header, not open to the
  public internet without it.
- Payment slip images live in a **private** Storage bucket, served to the
  admin dashboard via short-lived signed URLs rather than a public bucket.
- Auth is a signed JWT (`JWT_SECRET`), not a session cookie — same-origin
  frontend + API, so no CORS configuration is needed.

## 5. Still to do

- An SMS gateway for the forgot-PIN OTP (generated but not sent anywhere —
  see `api/rentals/forgot_pin_request.js`).
- `system_settings.unlock_hold_seconds` is stored and editable from the
  admin dashboard but not yet read by the ESP32 firmware, which still uses
  its own hardcoded `UNLOCK_HOLD_MS` constant.

See `petallock_esp32` for the Arduino sketch that talks to the ESP32
endpoints above.
