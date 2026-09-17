alter table external_purchases add column if not exists due_date date;
alter table external_purchases add column if not exists paid_at timestamptz;

alter table expenses add column if not exists due_date date;
alter table expenses add column if not exists paid_at timestamptz;
