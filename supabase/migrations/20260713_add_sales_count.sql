-- Add sales_count column to daily_closings for offline daily closing support
ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
