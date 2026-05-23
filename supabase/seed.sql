-- Seed file for development
-- This file contains sample data and setup instructions

-- Sample data (optional - uncomment if you want test users)
-- Create a test user profile (you would normally do this through the app)
DO $$
DECLARE
  uid uuid := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'test@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name": "Test User"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid,
      format('{"sub":"%s","email":"%s"}', uid::text, 'test@example.com')::jsonb,
      'email',
      uid::text,
      now(),
      now(),
      now()
    );
  END IF;
END
$$;

-- The profile will be automatically created by the trigger