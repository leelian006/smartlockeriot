-- Run this once in phpMyAdmin's SQL tab (Database: smart_locker) — it's
-- safe to run even on a database that already has data, since it only
-- adds a new table and won't touch users/rentals/payments/etc.
-- Safe to re-run too, if you already ran an earlier version of this file.

CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  location_name VARCHAR(150) NOT NULL DEFAULT 'อาคาร A ชั้น 1',
  unlock_hold_seconds INT NOT NULL DEFAULT 30,
  notify_hours_before INT NOT NULL DEFAULT 2
) ENGINE=InnoDB;

INSERT IGNORE INTO system_settings (id, location_name, unlock_hold_seconds, notify_hours_before)
VALUES (1, 'อาคาร A ชั้น 1', 30, 2);

-- If you already ran an earlier version of this migration (default was
-- 8 seconds), this brings the stored value in line with the firmware's
-- actual 30-second unlock hold.
UPDATE system_settings SET unlock_hold_seconds = 30 WHERE id = 1 AND unlock_hold_seconds = 8;
