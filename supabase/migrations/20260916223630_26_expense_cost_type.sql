alter table expenses add column if not exists cost_type text not null default 'variable' check (cost_type in ('fixed','variable'));
