alter table payment_methods add column if not exists is_deferred boolean not null default false;
alter table orders add column if not exists due_date date;
alter table orders add column if not exists paid_at timestamptz;
