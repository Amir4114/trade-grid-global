create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  company_name text,
  role text check (role in ('buyer', 'supplier', 'admin')) not null,
  created_at timestamptz not null default now()
);

create table countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text unique not null,
  name text unique not null,
  region text not null
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  parent_id uuid references categories(id)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id),
  company_name text not null,
  country_id uuid references countries(id) not null,
  city text,
  overview text,
  logo_url text,
  years_in_business integer not null default 0,
  trust_score integer not null default 50,
  response_time text,
  created_at timestamptz not null default now()
);

create table supplier_categories (
  supplier_id uuid references suppliers(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (supplier_id, category_id)
);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade not null,
  level text check (level in ('basic', 'verified', 'premium')) not null default 'basic',
  status text check (status in ('pending', 'approved', 'rejected')) not null default 'pending',
  certificate_names text[] not null default '{}',
  reviewed_at timestamptz,
  expires_at timestamptz
);

create table products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade not null,
  category_id uuid references categories(id) not null,
  country_id uuid references countries(id) not null,
  name text not null,
  description text,
  image_url text,
  moq text not null,
  packaging text,
  certifications text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid references users(id),
  category_id uuid references categories(id),
  product_name text not null,
  quantity text not null,
  target_country_id uuid references countries(id) not null,
  packaging_requirement text,
  delivery_port text,
  notes text,
  status text check (status in ('open', 'quoted', 'closed')) not null default 'open',
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references rfqs(id) on delete cascade not null,
  supplier_id uuid references suppliers(id) on delete cascade not null,
  price text,
  lead_time text,
  notes text,
  created_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);
