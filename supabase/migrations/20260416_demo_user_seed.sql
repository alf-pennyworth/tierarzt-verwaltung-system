-- Demo User Seed for Vet App
-- Run this in Supabase SQL Editor to create demo user

-- Note: Auth users must be created via API, not direct SQL
-- This script creates the profile after auth user is created

-- Demo user ID: 257dd0a0-b46a-47eb-93df-43f646cdf259
-- Email: demo@tierarzt-app.de
-- Password: demo123456

-- Create profile linked to demo practice
INSERT INTO public.profiles (id, praxis_id, full_name, role)
VALUES (
    '257dd0a0-b46a-47eb-93df-43f646cdf259',
    '00000000-0000-0000-0000-000000000001',
    'Demo User',
    'vet'
) ON CONFLICT (id) DO UPDATE SET
    praxis_id = EXCLUDED.praxis_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Verify the profile exists
SELECT p.*, pr.name as practice_name
FROM public.profiles p
JOIN public.praxis pr ON p.praxis_id = pr.id
WHERE p.id = '257dd0a0-b46a-47eb-93df-43f646cdf259';