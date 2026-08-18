# PetalLock Smart Locker — Backend (PHP + MySQL)

This is the real backend for the PetalLock web prototype. It's built with
plain PHP + PDO (no framework) so it runs on XAMPP with zero extra setup,
and MySQL for storage.

## 1. Setup (XAMPP)

1. Install XAMPP, start **Apache** and **MySQL**.
2. Copy this whole `smart-locker-backend` folder into `htdocs/`, e.g.
   `C:\xampp\htdocs\smart-locker-backend\` (Windows) or
   `/Applications/XAMPP/htdocs/smart-locker-backend/` (Mac).
3. Open `http://localhost/phpmyadmin`, create nothing manually — instead
   import `sql/schema.sql` (it creates the `smart_locker` database itself).
   phpMyAdmin → Import → choose file → Go.
4. Open `http://localhost/smart-locker-backend/api/seed_admin.php` once in
   your browser. This creates the default admin login:
   - username: `admin`
   - password: `admin1234`

   **Delete `api/seed_admin.php` after running it once.**
5. Open `api/config.php` and check `$DB_USER` / `$DB_PASS` match your MySQL
   setup (XAMPP default is `root` with an empty password — already set).
6. Open `api/config.php` and change `DEVICE_API_KEY` to a long random
   string. Put the same string in the ESP32 firmware later.

Your API is now live at `http://localhost/smart-locker-backend/api/...`

## 2. Frontend structure

The web frontend is split into separate pages (not one single-page app),
so each login/register/dashboard is a real browser navigation:

| File | Purpose |
|---|---|
| `index.html` | Login (both user and admin — a tab switches which) |
| `register.php` | Sign-up page |
| `user-dashboard.php` | Customer app — server-side checks the session and redirects to `index.html` if not logged in as a user |
| `admin-dashboard.php` | Admin app — same guard, checks for an admin session |
| `styles.css` | Shared stylesheet used by all four pages |
| `common.js` | Shared JS: the `api()`/`apiGet()`/`apiPost()` fetch helpers, chat rendering, logout, and the terms-of-service modal |

All four pages are fully wired to the API already (login/register, rent
flow with real file upload, admin slip queue, PIN set/forgot-PIN, live
countdown, chat, reports chart, emergency unlock) — nothing further
needed to connect them.

## 3. API reference

All endpoints return JSON: `{"ok": true, ...}` or `{"ok": false, "error": "..."}`.
POST endpoints (except file upload) expect a **JSON body**, not form-encoded.

### Auth
| Method | Endpoint | Who | Body |
|---|---|---|---|
| POST | `/api/auth/register.php` | anyone | `first_name, last_name, phone, email, password` |
| POST | `/api/auth/login.php` | anyone | `identifier` (phone or email), `password` |
| POST | `/api/auth/admin_login.php` | anyone | `username, password` |
| POST | `/api/auth/logout.php` | logged in | — |

### Lockers
| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/lockers/list.php` | anyone |

### Rentals (user)
| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/rentals/create.php` | `locker_id, duration_minutes, price` — reserves intent, before payment |
| GET | `/api/rentals/my.php` | — active/expired rentals with live countdown |
| GET | `/api/rentals/history.php` | — past confirmed rentals |
| POST | `/api/rentals/set_pin.php` | `rental_id, pin` (4 digits) |
| GET | `/api/rentals/notifications.php` | — rejection notices to show as banners |
| POST | `/api/rentals/forgot_pin_request.php` | `rental_id` — sends OTP (SMS not wired up, see TODO in file) |
| POST | `/api/rentals/forgot_pin_reset.php` | `rental_id, otp, new_pin` |

### Payments
| Method | Endpoint | Who | Notes |
|---|---|---|---|
| POST | `/api/payments/upload_slip.php` | user | **multipart/form-data**, not JSON: `rental_id, kind (new/extend), duration_minutes, price, slip` (file) |
| GET | `/api/payments/pending.php` | admin | the slip verification queue |
| POST | `/api/payments/confirm.php` | admin | `payment_id` |
| POST | `/api/payments/reject.php` | admin | `payment_id, reason` |

### Chat
| Method | Endpoint | Who | Body |
|---|---|---|---|
| POST | `/api/chat/send.php` | either | `message` (+ `user_id` if admin) |
| GET | `/api/chat/messages.php` | either | `?user_id=` (admin only) |
| GET | `/api/chat/conversations.php` | admin | list of customer threads with unread counts |

### Admin
| Method | Endpoint | Body |
|---|---|---|
| GET | `/api/admin/overview.php` | — stats + recent activity |
| GET | `/api/admin/reports.php` | — revenue stats + 7-day chart data |
| POST | `/api/admin/emergency_unlock.php` | `locker_ids: ["L-01"], reason` |

### ESP32 (device, not browser)
These use a header `X-Device-Key: <DEVICE_API_KEY>` instead of session
cookies, since the ESP32 can't hold a login session.

| Method | Endpoint | Body / Query | Purpose |
|---|---|---|---|
| GET | `/api/esp32/poll.php?locker_id=L-01` | — | ESP32 calls every few seconds; returns `{unlock: true}` once when a command is waiting (from web "ปลดล็อก" button, admin confirm, or emergency unlock) |
| POST | `/api/esp32/verify_pin.php` | `locker_id, pin` | ESP32 sends what was typed on the Keypad 4x4; returns `{unlock: true/false}`. Locks out for 5 minutes after 5 wrong attempts. |
| POST | `/api/esp32/door_status.php` | `locker_id, door_closed (bool)` | ESP32 reports MC-38 state on change/heartbeat |

## 4. Security notes already built in

- Passwords and locker PINs are stored with `password_hash()` (bcrypt) —
  never in plaintext.
- Keypad PIN attempts are rate-limited (5 wrong tries → 5 min lockout) to
  resist brute-forcing a 4-digit code.
- All SQL uses PDO prepared statements (no string-concatenated queries).
- The ESP32 endpoints require a shared secret key header, not open to the
  public internet without it.

## 5. Still to do

- An SMS gateway for the forgot-PIN OTP (currently generated but not
  sent anywhere — see TODO in `forgot_pin_request.php`; for local
  testing, look the code up directly in the `pin_reset_otps` table).

LINE Notify was intentionally cut from scope. The frontend (all four
pages) and the ESP32 firmware are both built and wired to this API —
see `petallock_esp32` for the Arduino sketch.

"# smartlockeriot" 
"# smartlockeriot" 
"# smartlockeriot" 
"# smartlockeriot" 
