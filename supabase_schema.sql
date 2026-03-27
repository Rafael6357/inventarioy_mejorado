-- Supabase Schema for InventarioY

-- Enable unaccent extension for accent-insensitive search
create extension if not exists unaccent;

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email text,
    name text,
    business_name text,
    role text default 'user',
    subscription_status text default 'trialing',
    trial_ends_at timestamp with time zone default (now() + interval '30 days'),
    valid_until timestamp with time zone,
    created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

do $$ begin
    create policy "Users can view their own profile." on public.profiles
        for select using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
    create policy "Users can update their own profile." on public.profiles
        for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- Categories table
create table if not exists public.categories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    created_at timestamp with time zone default now()
);

alter table public.categories enable row level security;

do $$ begin
    create policy "Users can manage their own categories." on public.categories
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Products table
create table if not exists public.products (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    category text, -- keeping as text to match current code logic, can be changed later
    quantity numeric default 0,
    unit text,
    price numeric default 0,
    cost numeric default 0,
    stock_min numeric default 0,
    stock_max numeric default 1000,
    expiration_date date,
    description text,
    is_individual boolean default true,
    is_active boolean default true,
    eoq numeric,
    rop numeric,
    lead_time numeric,
    order_cost numeric,
    holding_cost numeric,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.products enable row level security;

do $$ begin
    create policy "Users can manage their own products." on public.products
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Prevent duplicate product names (case and accent insensitive, active only)
create or replace function public.check_duplicate_product_name()
returns trigger as $$
begin
    if exists (
        select 1 from public.products
        where user_id = NEW.user_id
          and is_active = true
          and lower(unaccent(name)) = lower(unaccent(NEW.name))
          and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
        raise exception 'El producto "%" ya existe.', NEW.name;
    end if;
    return new;
end;
$$ language plpgsql security definer;

do $$ begin
    create trigger trg_check_duplicate_product_name
        before insert or update on public.products
        for each row execute procedure public.check_duplicate_product_name();
exception when duplicate_object then null;
end $$;

-- Movements table
create table if not exists public.movements (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    type text check (type in ('ENTRADA', 'SALIDA', 'MERMA')),
    quantity numeric not null,
    unit text,
    date timestamp with time zone default now(),
    cost numeric default 0,
    reason text,
    status text default 'NORMAL' check (status in ('NORMAL', 'ANOMALIA', 'JUSTIFICADO')),
    justification text,
    justification_date timestamp with time zone,
    created_at timestamp with time zone default now()
);

alter table public.movements enable row level security;

do $$ begin
    create policy "Users can manage their own movements." on public.movements
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Recipes table
create table if not exists public.recipes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    selling_price numeric default 0,
    created_at timestamp with time zone default now()
);

alter table public.recipes enable row level security;

do $$ begin
    create policy "Users can manage their own recipes." on public.recipes
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Recipe ingredients table
create table if not exists public.recipe_ingredients (
    id uuid default gen_random_uuid() primary key,
    recipe_id uuid references public.recipes(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    quantity numeric not null,
    unit text,
    created_at timestamp with time zone default now()
);

alter table public.recipe_ingredients enable row level security;

do $$ begin
    create policy "Users can manage their own recipe ingredients." on public.recipe_ingredients
        for all using (
            exists (
                select 1 from public.recipes 
                where id = recipe_ingredients.recipe_id 
                and user_id = auth.uid()
            )
        );
exception when duplicate_object then null;
end $$;

-- Sales table
create table if not exists public.sales (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    employee_id uuid, -- link to employees
    total_amount numeric default 0,
    date timestamp with time zone default now(),
    sale_type text check (sale_type in ('SALON', 'DOMICILIO')),
    notes text,
    discount numeric default 0,
    created_at timestamp with time zone default now()
);

alter table public.sales enable row level security;

do $$ begin
    create policy "Users can manage their own sales." on public.sales
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Sale items table
create table if not exists public.sale_items (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references public.sales(id) on delete cascade not null,
    product_id uuid, -- if it was a product
    recipe_id uuid,  -- if it was a recipe
    quantity numeric not null,
    unit_cost numeric default 0,
    selling_price numeric default 0,
    subtotal numeric default 0,
    is_recipe boolean default false,
    recipe_snapshot jsonb, -- for historical reference
    created_at timestamp with time zone default now()
);

alter table public.sale_items enable row level security;

do $$ begin
    create policy "Users can manage their own sale items." on public.sale_items
        for all using (
            exists (
                select 1 from public.sales 
                where id = sale_items.sale_id 
                and user_id = auth.uid()
            )
        );
exception when duplicate_object then null;
end $$;

-- Daily closings table
create table if not exists public.daily_closings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    closing_date date not null,
    total_sales numeric default 0,
    total_discounts numeric default 0,
    total_refunds numeric default 0,
    closing_amount numeric default 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone default now(),
    unique(user_id, closing_date)
);

alter table public.daily_closings enable row level security;

do $$ begin
    create policy "Users can manage their own daily closings." on public.daily_closings
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Employees table
create table if not exists public.employees (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    role text,
    salary numeric default 0,
    phone text,
    email text,
    created_at timestamp with time zone default now()
);

alter table public.employees enable row level security;

do $$ begin
    create policy "Users can manage their own employees." on public.employees
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ============================================
-- PAYMENTS: Historial de pagos manuales
-- ============================================
create table if not exists public.payments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    admin_id uuid references public.profiles(id) on delete set null,
    amount numeric not null default 0,
    payment_method text,
    reference text,
    notes text,
    payment_date date not null default current_date,
    created_at timestamp with time zone default now()
);

alter table public.payments enable row level security;

do $$ begin
    create policy "Admins can manage all payments." on public.payments
        for all using (true);
exception when duplicate_object then null;
end $$;

-- Trigger for profile creation on auth sign up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'user');
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- AI Conversations table for persisting chat history
create table if not exists public.ai_conversations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamp with time zone default now()
);

alter table public.ai_conversations enable row level security;

do $$ begin
    create policy "Users can manage their own AI conversations." on public.ai_conversations
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Auto-delete conversations older than 3 months (runs daily via cron)
-- Conversations are auto-deleted when they exceed 90 days
create or replace function public.cleanup_old_ai_conversations()
returns void as $$
begin
    delete from public.ai_conversations
    where created_at < now() - interval '90 days';
end;
$$ language plpgsql security definer;

-- ============================================
-- MIGRATION: Capitalize all existing data
-- Run this once to normalize existing records
-- ============================================

-- Normalize products (name and category)
update public.products
set name = initcap(name),
    category = initcap(category)
where is_active = true;

-- Normalize recipes (name)
update public.recipes
set name = initcap(name);

-- Normalize employees (name)
update public.employees
set name = initcap(name);

-- Normalize categories (name)
update public.categories
set name = initcap(name);

-- ============================================
-- TRÁNSITO: Tabla para productos en cocina/pendientes
-- ============================================

-- Agregar columna in_transit a productos si no existe
alter table public.products add column if not exists in_transit numeric default 0;

-- Tabla de tránsito: productos enviados a cocina
create table if not exists public.transit_items (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    quantity numeric not null default 0,
    consumed numeric not null default 0,
    remaining numeric not null default 0,
    reason text,
    sent_date timestamp with time zone default now(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.transit_items enable row level security;

do $$ begin
    create policy "Users can manage their own transit items." on public.transit_items
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Actualizar columna in_transit en productos existentes (basado en suma de remaining en transit_items)
-- Solo actualiza productos que tienen items en tránsito o que ya tienen in_transit > 0
update public.products p
set in_transit = coalesce(
    (select sum(t.remaining) from public.transit_items t where t.product_id = p.id),
    0
)
where id in (
    select distinct product_id from public.transit_items
) or in_transit is not null;

-- ============================================
-- GESTIÓN DOCUMENTAL DE RRHH
-- ============================================

-- Tabla de documentos generales de RRHH (Manuales, Reglamento Interno, PNOs)
create table if not exists public.hr_documents (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    doc_type text not null check (doc_type in ('MANUAL', 'REGLAMENTO', 'PNO')),
    file_url text not null,
    file_name text not null,
    file_size numeric,
    created_at timestamp with time zone default now()
);

alter table public.hr_documents enable row level security;

do $$ begin
    create policy "Users can manage their own HR documents." on public.hr_documents
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Tabla de documentos de empleados (Contratos, fotos, etc.)
create table if not exists public.employee_documents (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    employee_id uuid references public.employees(id) on delete cascade not null,
    name text not null,
    doc_type text not null check (doc_type in ('CONTRATO', 'IDENTIFICACION', 'OTRO')),
    file_url text not null,
    file_name text not null,
    file_size numeric,
    created_at timestamp with time zone default now()
);

alter table public.employee_documents enable row level security;

do $$ begin
    create policy "Users can manage their own employee documents." on public.employee_documents
        for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
