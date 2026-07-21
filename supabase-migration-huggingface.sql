-- Migration: Add Hugging Face API URL column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hf_api_url TEXT DEFAULT '';
