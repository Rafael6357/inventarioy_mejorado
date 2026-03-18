-- Supabase Schema for InventarioY

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

create policy "Users can view their own profile." on public.profiles
    for select using (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
    for update using (auth.uid() = id);

-- Categories table
create table if not exists public.categories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    created_at timestamp with time zone default now()
);

alter table public.categories enable row level security;

create policy "Users can manage their own categories." on public.categories
    for all using (auth.uid() = user_id);

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

create policy "Users can manage their own products." on public.products
    for all using (auth.uid() = user_id);

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

create policy "Users can manage their own movements." on public.movements
    for all using (auth.uid() = user_id);

-- Recipes table
create table if not exists public.recipes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    selling_price numeric default 0,
    created_at timestamp with time zone default now()
);

alter table public.recipes enable row level security;

create policy "Users can manage their own recipes." on public.recipes
    for all using (auth.uid() = user_id);

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

create policy "Users can manage their own recipe ingredients." on public.recipe_ingredients
    for all using (
        exists (
            select 1 from public.recipes 
            where id = recipe_ingredients.recipe_id 
            and user_id = auth.uid()
        )
    );

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

create policy "Users can manage their own sales." on public.sales
    for all using (auth.uid() = user_id);

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

create policy "Users can manage their own sale items." on public.sale_items
    for all using (
        exists (
            select 1 from public.sales 
            where id = sale_items.sale_id 
            and user_id = auth.uid()
        )
    );

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

create policy "Users can manage their own employees." on public.employees
    for all using (auth.uid() = user_id);

-- Trigger for profile creation on auth sign up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
