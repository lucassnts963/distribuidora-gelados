alter table expenses add column if not exists reverted_at timestamptz;
alter table expenses add column if not exists reversal_reason text;

alter table external_purchases add column if not exists reverted_at timestamptz;
alter table external_purchases add column if not exists reversal_reason text;
