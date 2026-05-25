-- Políticas RLS para que el admin (nikko6357@gmail.com) pueda ver y actualizar todos los perfiles
-- Ejecutar en el SQL Editor de Supabase (una sola vez)

do $$ begin
    create policy "Admin nikko6357 can view all profiles." on public.profiles
        for select using (
            auth.email() = 'nikko6357@gmail.com'
        );
exception when duplicate_object then null;
end $$;

do $$ begin
    create policy "Admin nikko6357 can update all profiles." on public.profiles
        for update using (
            auth.email() = 'nikko6357@gmail.com'
        );
exception when duplicate_object then null;
end $$;
