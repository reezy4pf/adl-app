-- Create Medications Table
create table if not exists public.medications (
    id text primary key, -- e.g. 'med_123456789'
    user_id uuid references auth.users not null,
    name text not null,
    dosage text, -- e.g. '10 mg'
    frequency numeric default 1,
    inventory numeric default 0,
    limit_alert numeric default 5,
    instructions text,
    reminder_times jsonb default '[]'::jsonb, -- Store array of time strings
    history jsonb default '[]'::jsonb, -- Store usage logs
    info jsonb default '{}'::jsonb, -- Extra metadata
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.medications enable row level security;

-- Policy: Users can only see/edit their own meds
drop policy if exists "Users can manage their own medications" on public.medications;
create policy "Users can manage their own medications"
on public.medications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create Sleep Logs Table (New)
create table if not exists public.sleep_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    log_date date not null default CURRENT_DATE,
    duration_minutes integer, -- Total sleep in minutes
    restlessness_count integer, -- Number of movements/wakings
    heart_rate_dip_percent integer, -- e.g. 15 for 15%
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Sleep Logs
alter table public.sleep_logs enable row level security;

-- Policy for Sleep Logs
drop policy if exists "Users can manage their own sleep logs" on public.sleep_logs;
create policy "Users can manage their own sleep logs"
on public.sleep_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Add missing columns to Tasks if not exists (based on previous errors)
-- Run these only if you haven't already
alter table public.tasks add column if not exists location text;
alter table public.tasks add column if not exists ends_next_day boolean default false;
alter table public.tasks add column if not exists color text;
