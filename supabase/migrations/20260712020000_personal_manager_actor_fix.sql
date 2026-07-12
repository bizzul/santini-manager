-- L'attore dell'abilitazione puo' arrivare anche dalla server action come
-- valore esplicito di personal_manager_abilitato_da (service client, dove
-- auth.uid() e' NULL). Il trigger lo rispetta se e' stato cambiato nella
-- stessa UPDATE; altrimenti usa set_config/app.actor_id, auth.uid(), o
-- come ultima spiaggia l'utente stesso.
CREATE OR REPLACE FUNCTION public.personal_manager_flag_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.personal_manager_abilitato IS DISTINCT FROM OLD.personal_manager_abilitato THEN
    v_actor := COALESCE(
      CASE
        WHEN NEW.personal_manager_abilitato_da IS DISTINCT FROM OLD.personal_manager_abilitato_da
        THEN NEW.personal_manager_abilitato_da
      END,
      NULLIF(current_setting('app.actor_id', true), '')::uuid,
      auth.uid(),
      NEW.auth_id,
      NULLIF(NEW."authId", '')::uuid
    );
    NEW.personal_manager_abilitato_at := now();
    NEW.personal_manager_abilitato_da := v_actor;
  END IF;
  RETURN NEW;
END;
$$;
