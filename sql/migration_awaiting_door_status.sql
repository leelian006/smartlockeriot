-- Run this once in phpMyAdmin's SQL tab (Database: smart_locker) — adds
-- the new "awaiting_door" rental status, used between "PIN just set"
-- and "timer running": the countdown now only starts once the MC-38
-- sensor confirms the door is actually closed. Safe to run on a
-- database that already has data.

ALTER TABLE rentals MODIFY status
  ENUM('pending_payment','pending_pin','awaiting_door','active','expired','completed','rejected')
  NOT NULL DEFAULT 'pending_payment';
