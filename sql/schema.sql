-- PetalLock Smart Locker — Database Schema
-- Import this with phpMyAdmin (XAMPP) or: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS smart_locker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_locker;

-- ---------------------------------------------------------------
-- Users (customers, from the web "สมัครสมาชิก" flow)
-- ---------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Admins (staff who verify slips / manage lockers)
-- ---------------------------------------------------------------
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Physical lockers — one row per real locker (matches ESP32/relay count)
-- ---------------------------------------------------------------
CREATE TABLE lockers (
  id VARCHAR(10) PRIMARY KEY,          -- e.g. 'L-01', 'L-02'
  location VARCHAR(150) NOT NULL,
  state ENUM('available','occupied') NOT NULL DEFAULT 'available',
  door_closed TINYINT(1) NOT NULL DEFAULT 1,   -- from MC-38 sensor
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO lockers (id, location, state, door_closed) VALUES
  ('L-01', 'อาคาร A ชั้น 1', 'available', 1),
  ('L-02', 'อาคาร A ชั้น 1', 'available', 1);

-- ---------------------------------------------------------------
-- Rentals — one row per active/past rental session
-- ---------------------------------------------------------------
CREATE TABLE rentals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locker_id VARCHAR(10) NOT NULL,
  user_id INT NOT NULL,
  pin_hash VARCHAR(255) NULL,          -- bcrypt hash of the 4-digit PIN (never store plaintext)
  pin_set TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('pending_payment','pending_pin','awaiting_door','active','expired','completed','rejected') NOT NULL DEFAULT 'pending_payment',
  duration_minutes INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  started_at DATETIME NULL,            -- countdown begins when admin confirms payment
  expires_at DATETIME NULL,
  pin_fail_count INT NOT NULL DEFAULT 0,   -- for keypad brute-force lockout
  pin_locked_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (locker_id) REFERENCES lockers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Payments — slip submissions for new rentals AND time extensions
-- ---------------------------------------------------------------
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rental_id INT NOT NULL,
  kind ENUM('new','extend','penalty') NOT NULL DEFAULT 'new',
  ref_code VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  slip_path VARCHAR(255) NULL,
  status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  reject_reason TEXT NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rentals(id),
  FOREIGN KEY (reviewed_by) REFERENCES admins(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- One-time codes for "ลืมรหัสผ่านตู้" (forgot PIN) flow
-- ---------------------------------------------------------------
CREATE TABLE pin_reset_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rental_id INT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rentals(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Chat between a user and admin
-- ---------------------------------------------------------------
CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sender ENUM('user','admin') NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Activity log — admin overview feed + emergency-unlock audit trail
-- ---------------------------------------------------------------
CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locker_id VARCHAR(10) NULL,
  actor VARCHAR(150) NOT NULL,         -- user's name, or 'ระบบ (แอดมิน)'
  action VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Pending unlock commands — the bridge between web/admin actions and
-- the ESP32, which polls this table instead of receiving a push.
-- ---------------------------------------------------------------
CREATE TABLE unlock_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locker_id VARCHAR(10) NOT NULL,
  reason VARCHAR(255) NOT NULL,        -- 'user_unlock' | 'admin_confirm' | 'emergency'
  consumed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (locker_id) REFERENCES lockers(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- System-wide settings (admin "ตั้งค่าระบบ" page) — single row.
-- NOTE: unlock_hold_seconds is not yet read by the ESP32 firmware,
-- which still uses its own hardcoded UNLOCK_HOLD_MS constant. This
-- table lets the value be stored and edited from the web; wiring the
-- firmware to actually fetch and use it is a separate follow-up.
-- ---------------------------------------------------------------
CREATE TABLE system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  location_name VARCHAR(150) NOT NULL DEFAULT 'อาคาร A ชั้น 1',
  unlock_hold_seconds INT NOT NULL DEFAULT 30,
  notify_hours_before INT NOT NULL DEFAULT 2
) ENGINE=InnoDB;

INSERT INTO system_settings (id, location_name, unlock_hold_seconds, notify_hours_before)
VALUES (1, 'อาคาร A ชั้น 1', 30, 2);
