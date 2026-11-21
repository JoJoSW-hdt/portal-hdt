-- Corrige o acesso de leitura à agenda pública de eventos.
-- As policies RLS continuam limitando a leitura a eventos publicados
-- para visitantes e a todos os eventos para Founder/Staff.
grant select on public.events to anon, authenticated;
