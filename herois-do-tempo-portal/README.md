# Heróis do Tempo — Portal da comunidade

Portal responsivo com identidade retrô verde, área pública, autenticação, perfis enxutos e sistema administrativo de badges.

## O que esta versão inclui

- Página inicial pública e diretório de membros.
- Cadastro por e-mail e senha, sujeito à aprovação.
- Perfis públicos com foto, nick do Discord, frase de efeito e coleção de badges.
- O membro só pode editar a própria foto, o nick do Discord e a frase de efeito.
- Catálogo administrativo de badges únicas: arte própria, nome, descrição e raridade (Comum, Incomum, Rara, Épica, Lendária e Mítica).
- Administração pode criar, editar e excluir badges, conceder e retirar badges de membros.
- Cada concessão registra automaticamente data e administrador responsável.
- Ao clicar numa badge do perfil, abre detalhes com nome, arte, descrição, raridade e data de conquista.
- Regras de acesso no banco via Supabase RLS e funções `security definer`.

## Configuração

1. Crie um projeto em https://supabase.com/.
2. No painel do Supabase, abra **SQL Editor** e execute o arquivo completo `supabase/schema.sql`.
   - Se você já executou uma versão anterior do esquema, pode executar o arquivo completo novamente: os comandos foram escritos para adicionar as tabelas/colunas e políticas necessárias sem recriar o projeto.
3. Em **Project Settings > API**, copie a Project URL e a chave `anon`/publishable.
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Instale e rode:

   ```bash
   npm install
   npm run dev
   ```

6. Crie sua conta no portal. Em **Authentication > Users**, copie o UUID da conta.
7. No SQL Editor, promova sua conta inicial a Fundador:

   ```sql
   update public.profiles
   set role = 'founder', status = 'approved'
   where id = 'SEU-UUID-AQUI';
   ```

8. Entre novamente no portal. Acesse **Gerenciar badges** para cadastrar as artes e **Conceder badges** para atribuir as conquistas.

## Hospedagem

O projeto pode ser publicado na Vercel como aplicação Vite:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

## Segurança

- Nunca coloque a chave `service_role` no frontend.
- As operações administrativas de badges são validadas no banco, não apenas escondidas na interface.
- O bucket `portal-assets` é criado pelo SQL. Fotos e artes aceitam PNG, JPG e WEBP até 5 MB.
- Visitantes podem consultar perfis aprovados e o catálogo público. Somente o dono do perfil altera seus dados; somente Fundador/Administrador gerencia badges e aprova membros.
