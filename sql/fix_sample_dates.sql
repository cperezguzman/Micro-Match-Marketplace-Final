-- =====================================================
-- Fix Sample Data Dates (2024 -> 2026)
-- Run this to update existing dates in the database
-- Safe to run multiple times (idempotent)
-- =====================================================

USE micro_match;

-- Update project deadlines from 2024 to 2026
UPDATE project 
SET deadline = DATE_ADD(deadline, INTERVAL 2 YEAR)
WHERE deadline >= '2024-01-01' AND deadline < '2025-01-01';

-- Verify the changes
SELECT project_id, title, deadline 
FROM project 
WHERE deadline >= '2026-01-01' 
ORDER BY deadline;
