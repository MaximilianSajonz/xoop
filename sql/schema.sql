-- xoop schema — Whoop data mirror
-- run in Supabase SQL editor

create table if not exists whoop_tokens (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

create table if not exists whoop_profile (
  user_id bigint primary key,
  email text,
  first_name text,
  last_name text,
  height_meter numeric,
  weight_kilogram numeric,
  max_heart_rate int,
  updated_at timestamptz default now()
);

create table if not exists whoop_cycle (
  id bigint primary key,
  user_id bigint not null,
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
  cycle_id bigint primary key,
  user_id bigint not null,
  sleep_id bigint,
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
  id bigint primary key,
  user_id bigint not null,
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
  id bigint primary key,
  user_id bigint not null,
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
