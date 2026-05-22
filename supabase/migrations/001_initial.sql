-- ============================================================
--  PaffToChad — Schéma initial Supabase
--  Exécuter dans l'éditeur SQL de Supabase (ou via supabase db push)
-- ============================================================

-- Extension UUID (déjà active sur Supabase, juste au cas où)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- TABLE : users
-- Uniquement 2 entrées (vous deux). Pas d'auth Supabase native,
-- la "session" est simulée via localStorage.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    avatar_url TEXT,
    email      TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLE : objectifs
-- Les 4 objectifs à suivre quotidiennement.
-- order_index permet de contrôler l'ordre d'affichage.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.objectifs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    description TEXT,
    order_index INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLE : logs
-- Un enregistrement par (user, objectif, date).
-- completed = true  → objectif réussi ce jour-là
-- completed = false → objectif raté / non complété
-- La contrainte UNIQUE empêche les doublons.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
    objectif_id  UUID NOT NULL REFERENCES public.objectifs(id)  ON DELETE CASCADE,
    date         DATE NOT NULL,
    completed    BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_log UNIQUE (user_id, objectif_id, date)
);

-- Index pour accélerer les requêtes par user + date
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON public.logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_date      ON public.logs (date);

-- ============================================================
--  SEED DATA — À adapter avec vos vraies infos
-- ============================================================

-- 2 utilisateurs (remplacez les avatars par de vraies URLs ou
-- des initiales générées via https://ui-avatars.com)
INSERT INTO public.users (id, name, avatar_url, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Alex',   NULL, 'alex@example.com'),
    ('00000000-0000-0000-0000-000000000002', 'Aurel',  NULL, 'aurel@example.com')
ON CONFLICT (id) DO NOTHING;

-- 4 objectifs (modifiez les titres à votre guise)
INSERT INTO public.objectifs (id, title, description, order_index) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Se lever dès le premier réveil',   'Pas de snooze, pas de négociation.', 0),
    ('10000000-0000-0000-0000-000000000002', 'Faire du sport',                    '30 min minimum de mouvement.', 1),
    ('10000000-0000-0000-0000-000000000003', 'Lire au moins 10 pages',           'N''importe quel livre de qualité.', 2),
    ('10000000-0000-0000-0000-000000000004', 'Pas de réseaux sociaux avant 12h', 'Protéger l''attention matinale.', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
--  RLS (Row Level Security) — Optionnel si app privée/locale
--  Désactivé ici pour simplifier. À activer si besoin.
-- ============================================================
ALTER TABLE public.users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectifs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs      DISABLE ROW LEVEL SECURITY;

-- Si vous voulez activer les accès anonymes via la clé anon :
-- Grant SELECT/INSERT/UPDATE sur les tables pour le rôle anon
GRANT SELECT, INSERT, UPDATE ON public.users     TO anon;
GRANT SELECT                  ON public.objectifs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.logs      TO anon;
