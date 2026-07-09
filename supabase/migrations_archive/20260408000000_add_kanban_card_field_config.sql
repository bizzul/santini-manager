-- Persist card field visibility preferences per kanban
ALTER TABLE "Kanban"
ADD COLUMN IF NOT EXISTS card_field_config JSONB;

COMMENT ON COLUMN "Kanban".card_field_config IS
'Configura i campi visibili nelle card (versione estesa/ridotta) per kanban';
