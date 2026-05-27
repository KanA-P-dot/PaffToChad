-- Migration 003 : rendre les objectifs par utilisateur

-- 1. Ajouter la colonne user_id
ALTER TABLE public.objectifs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Assigner les 4 objectifs seeds existants à Alex (user 001)
UPDATE public.objectifs
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

-- 3. Créer des copies pour Aurel (user 002)
INSERT INTO public.objectifs (title, description, order_index, user_id)
SELECT title, description, order_index, '00000000-0000-0000-0000-000000000002'
FROM public.objectifs
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 4. Corriger les grants (était SELECT uniquement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectifs TO anon;
