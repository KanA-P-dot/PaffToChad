-- ============================================================
--  Bucket Supabase Storage pour les avatars + suppression user
-- ============================================================

-- Bucket "avatars" public (photos de profil uploadées)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies : accès anon en lecture/écriture/suppression
CREATE POLICY "anon_insert_avatars" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "anon_update_avatars" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "anon_delete_avatars" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'avatars');

-- Permettre la suppression d'un compte utilisateur
-- (ON DELETE CASCADE sur objectifs + logs)
GRANT DELETE ON public.users TO anon;
