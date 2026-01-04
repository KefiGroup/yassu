-- Add admin role for paulinet77@gmail.com
-- Run this in Railway's database console

-- First, check if the user exists and get their ID
DO $$
DECLARE
  user_id_var INTEGER;
BEGIN
  -- Find the user by email
  SELECT id INTO user_id_var FROM users WHERE email = 'paulinet77@gmail.com';
  
  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User paulinet77@gmail.com not found';
  ELSE
    RAISE NOTICE 'User found with ID: %', user_id_var;
    
    -- Check if admin role already exists
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_id_var AND role = 'admin') THEN
      RAISE NOTICE 'User already has admin role';
    ELSE
      -- Insert admin role
      INSERT INTO user_roles (user_id, role, created_at)
      VALUES (user_id_var, 'admin', NOW());
      
      RAISE NOTICE 'Admin role added successfully!';
    END IF;
  END IF;
END $$;

-- Verify the admin role was added
SELECT u.id, u.email, u.full_name, ur.role, ur.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'paulinet77@gmail.com';
