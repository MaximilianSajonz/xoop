-- xoop schema — Whoop data mirror (API v2)
-- run in Supabase SQL editor

-- High-resolution heart rate samples from Whoop data export
create table if not exists whoop_hr_sample (
  ts timestamptz primary key,
  bpm int not null,
  source text default 'export'
);
create index if not exists whoop_hr_sample_ts_idx on whoop_hr_sample (ts);

-- Journal entries from Whoop app (behaviors logged each morning)
create table if not exists whoop_journal (
  id text primary key,
  day date not null,
  question text not null,
  answer text,
  raw jsonb,
  imported_at timestamptz default now()
);
create index if not exists whoop_journal_day_idx on whoop_journal (day);
create index if not exists whoop_journal_question_idx on whoop_journal (question);

-- Generic landing zone for unknown CSVs from imports
create table if not exists whoop_import_raw (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  row_index int not null,
  row jsonb not null,
  imported_at timestamptz default now()
);
create index if not exists whoop_import_raw_filename_idx on whoop_import_raw (filename);

create table if not exists whoop_annotation (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  tag text not null,
  value numeric,
  note text,
  created_at timestamptz default now()
);
create index if not exists whoop_annotation_day_idx on whoop_annotation (day);
create index if not exists whoop_annotation_tag_idx on whoop_annotation (tag);

create table if not exists whoop_tokens (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

create table if not exists whoop_profile (
  user_id text primary key,
  email text,
  first_name text,
  last_name text,
  height_meter numeric,
  weight_kilogram numeric,
  max_heart_rate int,
  updated_at timestamptz default now()
);

create table if not exists whoop_cycle (
  id text primary key,
  user_id text not null,
  start_ts timestamptz not null,
  end_ts timestamptz,
  timezone_offset text,
  score_state text,
  strain numeric,
  kilojoule numeric,
  average_heart_rate int,
  max_heart_rate int,
  raw jsonb not null,
  synced_at timestamptz default now()
);

create table if not exists whoop_recovery (
  cycle_id text primary key,
  user_id text not null,
  sleep_id text,
  created_at_ts timestamptz,
  score_state text,
  user_calibrating boolean,
  recovery_score numeric,
  resting_heart_rate int,
  hrv_rmssd_milli numeric,
  spo2_percentage numeric,
  skin_temp_celsius numeric,
  raw jsonb not null,
  synced_at timestamptz default now()
);

create table if not exists whoop_sleep (
  id text primary key,
  user_id text not null,
  start_ts timestamptz not null,
  end_ts timestamptz,
  nap boolean,
  score_state text,
  sleep_performance_percentage numeric,
  sleep_consistency_percentage numeric,
  sleep_efficiency_percentage numeric,
  total_in_bed_milli bigint,
  total_awake_milli bigint,
  total_light_sleep_milli bigint,
  total_slow_wave_sleep_milli bigint,
  total_rem_sleep_milli bigint,
  disturbance_count int,
  respiratory_rate numeric,
  raw jsonb not null,
  synced_at timestamptz default now()
);

create table if not exists whoop_workout (
  id text primary key,
  user_id text not null,
  start_ts timestamptz not null,
  end_ts timestamptz,
  sport_id int,
  score_state text,
  strain numeric,
  average_heart_rate int,
  max_heart_rate int,
  kilojoule numeric,
  distance_meter numeric,
  altitude_gain_meter numeric,
  altitude_change_meter numeric,
  zone_zero_milli bigint,
  zone_one_milli bigint,
  zone_two_milli bigint,
  zone_three_milli bigint,
  zone_four_milli bigint,
  zone_five_milli bigint,
  raw jsonb not null,
  synced_at timestamptz default now()
);

create index if not exists whoop_cycle_start_idx on whoop_cycle (user_id, start_ts desc);
create index if not exists whoop_sleep_start_idx on whoop_sleep (user_id, start_ts desc);
create index if not exists whoop_workout_start_idx on whoop_workout (user_id, start_ts desc);
