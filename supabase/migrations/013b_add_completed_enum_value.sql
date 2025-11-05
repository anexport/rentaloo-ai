-- Migration: Add 'completed' to booking_status enum
-- This must be run BEFORE 014_booking_system_high_priority_fixes.sql
-- because enum values must be committed before they can be used in triggers

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';

