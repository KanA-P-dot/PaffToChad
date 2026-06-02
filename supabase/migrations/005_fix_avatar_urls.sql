-- Stocke les chemins des avatars directement en DB
UPDATE public.users SET avatar_url = '/avatars/alex.png'  WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.users SET avatar_url = '/avatars/aurel.png' WHERE id = '00000000-0000-0000-0000-000000000002';
