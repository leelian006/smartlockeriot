-- Run this once in phpMyAdmin's SQL tab (Database: smart_locker) — adds
-- the new "ค่าปรับ" (overtime penalty) payment kind. Safe to run on a
-- database that already has data.

ALTER TABLE payments MODIFY kind ENUM('new','extend','penalty') NOT NULL DEFAULT 'new';
