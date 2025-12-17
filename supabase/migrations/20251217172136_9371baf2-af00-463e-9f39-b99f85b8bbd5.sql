-- Add full permissions for tenant's owner role (de5d8d2c-1cc5-4926-a841-1a597747308b)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  '043746e5-704c-47b3-b612-c78ab5e8ef40' as role_id, -- owner role for tenant de5d8d2c-1cc5-4926-a841-1a597747308b
  p.id as permission_id
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = '043746e5-704c-47b3-b612-c78ab5e8ef40' 
  AND rp.permission_id = p.id
)
ON CONFLICT DO NOTHING;