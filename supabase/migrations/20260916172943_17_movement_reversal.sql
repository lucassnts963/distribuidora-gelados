-- Cancelamento é estorno, não deleção: apagar um movimento antigo faria o
-- recálculo cronológico do custo médio reescrever em silêncio o custo de
-- todas as saídas posteriores, mudando relatório de período já fechado.
alter table inventory_movements
  drop constraint inventory_movements_movement_type_check;
alter table inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in ('production','purchase','sale','adjustment','loss','reversal'));

alter table inventory_movements
  drop constraint inventory_movements_reference_type_check;
alter table inventory_movements
  add constraint inventory_movements_reference_type_check
  check (reference_type in ('order','external_purchase','manual','production_batch'));

-- Aponta pro movimento que está sendo desfeito: é a trilha de auditoria e
-- é o que impede estornar duas vezes a mesma coisa.
alter table inventory_movements
  add column if not exists reverses_movement_id uuid
  references inventory_movements(id) on delete restrict;

create unique index if not exists inventory_movements_one_reversal
  on inventory_movements (reverses_movement_id)
  where reverses_movement_id is not null;

-- Mesma ideia do lado do insumo, pra poder devolver o que a produção consumiu.
alter table raw_material_movements
  add column if not exists reverses_movement_id uuid
  references raw_material_movements(id) on delete restrict;

create unique index if not exists raw_material_movements_one_reversal
  on raw_material_movements (reverses_movement_id)
  where reverses_movement_id is not null;
