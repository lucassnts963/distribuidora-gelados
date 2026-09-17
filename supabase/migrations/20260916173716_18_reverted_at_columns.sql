-- "reverted_at" marca um fato que aconteceu e foi desfeito, distinto de
-- status='cancelled' (que em orders já significa "nunca chegou a sair").
alter table orders add column if not exists reverted_at timestamptz;
alter table production_batches add column if not exists reverted_at timestamptz;
