-- Datos de ejemplo solo para desarrollo local, cargados por
-- `supabase db reset` / `supabase start`. Nunca corre contra un proyecto
-- real. El resto de datos ficticios (un clan de ejemplo con miembros,
-- guerras, etc.) se añaden con `npm run seed:fixtures --workspace=collector`
-- una vez este seed crea la cuenta de líder de ejemplo.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'lider@demo.test',
  crypt('demo12345', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Líder Demo"}',
  now(),
  now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at
) values (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"sub":"a0000000-0000-0000-0000-000000000001","email":"lider@demo.test"}',
  'email',
  now(),
  now()
) on conflict (provider_id, provider) do nothing;
