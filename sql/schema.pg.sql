-- PetalLock Smart Locker — Postgres schema (Supabase)
-- Run this once in the Supabase SQL editor. Ported from sql/schema.sql
-- (MySQL) + the 3 migration files, collapsed into one current schema.
--
-- Differences from the MySQL version:
--   - SERIAL instead of AUTO_INCREMENT
--   - TEXT + CHECK instead of ENUM
--   - native BOOLEAN instead of TINYINT(1)
--   - TIMESTAMPTZ instead of TIMESTAMP/DATETIME
--   - a trigger replaces MySQL's "ON UPDATE CURRENT_TIMESTAMP"

-- ---------------------------------------------------------------
-- Users (customers, from the web "สมัครสมาชิก" flow)
-- ---------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Admins (staff who verify slips / manage lockers)
-- ---------------------------------------------------------------
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Physical lockers — one row per real locker (matches ESP32/relay count)
-- ---------------------------------------------------------------
CREATE TABLE lockers (
  id VARCHAR(10) PRIMARY KEY,          -- e.g. 'L-01', 'L-02'
  location VARCHAR(150) NOT NULL,
  state TEXT NOT NULL DEFAULT 'available' CHECK (state IN ('available','occupied')),
  door_closed BOOLEAN NOT NULL DEFAULT TRUE,   -- from MC-38 sensor
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lockers_set_updated_at
  BEFORE UPDATE ON lockers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO lockers (id, location, state, door_closed) VALUES
  ('L-01', 'อาคาร A ชั้น 1', 'available', TRUE),
  ('L-02', 'อาคาร A ชั้น 1', 'available', TRUE);

-- ---------------------------------------------------------------
-- Rentals — one row per active/past rental session
-- ---------------------------------------------------------------
CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  locker_id VARCHAR(10) NOT NULL REFERENCES lockers(id),
  user_id INT NOT NULL REFERENCES users(id),
  pin_hash VARCHAR(255) NULL,          -- bcrypt hash of the 4-digit PIN (never store plaintext)
  pin_set BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN
    ('pending_payment','pending_pin','awaiting_door','active','expired','completed','rejected')),
  duration_minutes INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  started_at TIMESTAMPTZ NULL,         -- countdown begins when the door actually closes
  expires_at TIMESTAMPTZ NULL,
  pin_fail_count INT NOT NULL DEFAULT 0,   -- for keypad brute-force lockout
  pin_locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Payments — slip submissions for new rentals AND time extensions
-- ---------------------------------------------------------------
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  rental_id INT NOT NULL REFERENCES rentals(id),
  kind TEXT NOT NULL DEFAULT 'new' CHECK (kind IN ('new','extend','penalty')),
  ref_code VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  slip_path VARCHAR(255) NULL,         -- Supabase Storage object path, e.g. "slip_12_....jpg"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  reject_reason TEXT NULL,
  reviewed_by INT NULL REFERENCES admins(id),
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- One-time codes for "ลืมรหัสผ่านตู้" (forgot PIN) flow
-- ---------------------------------------------------------------
CREATE TABLE pin_reset_otps (
  id SERIAL PRIMARY KEY,
  rental_id INT NOT NULL REFERENCES rentals(id),
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Chat between a user and admin
-- ---------------------------------------------------------------
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  sender TEXT NOT NULL CHECK (sender IN ('user','admin')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Activity log — admin overview feed + emergency-unlock audit trail
-- ---------------------------------------------------------------
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  locker_id VARCHAR(10) NULL,
  actor VARCHAR(150) NOT NULL,         -- user's name, or 'ระบบ (แอดมิน)'
  action VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Pending unlock commands — the bridge between web/admin actions and
-- the ESP32, which polls this table instead of receiving a push.
-- ---------------------------------------------------------------
CREATE TABLE unlock_commands (
  id SERIAL PRIMARY KEY,
  locker_id VARCHAR(10) NOT NULL REFERENCES lockers(id),
  reason VARCHAR(255) NOT NULL,        -- 'user_unlock' | 'admin_confirm' | 'emergency'
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- System-wide settings (admin "ตั้งค่าระบบ" page) — single row.
-- NOTE: unlock_hold_seconds is not yet read by the ESP32 firmware,
-- which still uses its own hardcoded UNLOCK_HOLD_MS constant.
-- ---------------------------------------------------------------
CREATE TABLE system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  location_name VARCHAR(150) NOT NULL DEFAULT 'อาคาร A ชั้น 1',
  unlock_hold_seconds INT NOT NULL DEFAULT 30,
  notify_hours_before INT NOT NULL DEFAULT 2
);

INSERT INTO system_settings (id, location_name, unlock_hold_seconds, notify_hours_before)
VALUES (1, 'อาคาร A ชั้น 1', 30, 2);

-- Helpful indexes for the query patterns seen across the API
CREATE INDEX idx_rentals_locker_status ON rentals(locker_id, status);
CREATE INDEX idx_rentals_user ON rentals(user_id);
CREATE INDEX idx_payments_rental ON payments(rental_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_unlock_commands_locker_consumed ON unlock_commands(locker_id, consumed);
