-- ============================================================
--  Ajout du 3ème utilisateur : "pote d'aurel"
-- ============================================================

INSERT INTO public.users (id, name, avatar_url, email) VALUES
    ('00000000-0000-0000-0000-000000000003', 'pote d''aurel', NULL, 'pote@example.com')
ON CONFLICT (id) DO NOTHING;
