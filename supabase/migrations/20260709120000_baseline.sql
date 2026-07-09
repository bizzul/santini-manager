

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ClientAddressType" AS ENUM (
    'CONSTRUCTION_SITE',
    'OTHER'
);


ALTER TYPE "public"."ClientAddressType" OWNER TO "postgres";


CREATE TYPE "public"."ClientType" AS ENUM (
    'INDIVIDUAL',
    'BUSINESS'
);


ALTER TYPE "public"."ClientType" OWNER TO "postgres";


CREATE TYPE "public"."QC_Status" AS ENUM (
    'NOT_DONE',
    'PARTIALLY_DONE',
    'DONE'
);


ALTER TYPE "public"."QC_Status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_default_modules_for_site"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO "public"."site_modules" ("site_id", "module_name", "is_enabled")
    VALUES 
        (NEW.id, 'dashboard', true),
        (NEW.id, 'kanban', true),
        (NEW.id, 'clients', true),
        (NEW.id, 'inventory', true),
        (NEW.id, 'products', true),
        (NEW.id, 'suppliers', true),
        (NEW.id, 'categories', true),
        (NEW.id, 'projects', false),
        (NEW.id, 'calendar', false),
        (NEW.id, 'errortracking', false),
        (NEW.id, 'timetracking', false),
        (NEW.id, 'reports', false),
        (NEW.id, 'qualitycontrol', false),
        (NEW.id, 'boxing', false);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_default_modules_for_site"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cerca_articolo"("p_site_id" "uuid", "p_query" "text") RETURNS TABLE("id" integer, "codice" "text", "descrizione" "text", "unit" "text", "list_price" numeric, "image_url" "text", "score" real)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    sp.id,
    sp.internal_code AS codice,
    COALESCE(NULLIF(TRIM(sp.description), ''), sp.name) AS descrizione,
    sp.unit,
    sp.list_price,
    sp.image_url,
    GREATEST(
      CASE
        WHEN sp.internal_code IS NOT NULL
          AND lower(trim(sp.internal_code)) = lower(trim(p_query))
        THEN 1.0::real
        ELSE 0::real
      END,
      similarity(
        COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, ''),
        p_query
      )
    ) AS score
  FROM public."SellProduct" sp
  WHERE sp.site_id = p_site_id
    AND (sp.active IS NULL OR sp.active IS TRUE)
    AND (
      (sp.internal_code IS NOT NULL AND sp.internal_code ILIKE '%' || p_query || '%')
      OR (COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, '')) % p_query
      OR similarity(
        COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, ''),
        p_query
      ) >= 0.2
    )
  ORDER BY score DESC
  LIMIT 5;
$$;


ALTER FUNCTION "public"."cerca_articolo"("p_site_id" "uuid", "p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    EXECUTE format('CREATE TABLE %I.users (id UUID PRIMARY KEY, name TEXT, lastName TEXT, role TEXT, organization_id UUID REFERENCES public.organizations(id))', schema_name);
END;$$;


ALTER FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_3d_user_can_access_site"("target_site_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM "public"."User" u
        WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
    OR target_site_id IN (
        SELECT us.site_id
        FROM "public"."user_sites" us
        WHERE us.user_id = auth.uid()
    )
    OR target_site_id IN (
        SELECT s.id
        FROM "public"."sites" s
        INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
        WHERE uo.user_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."dashboard_3d_user_can_access_site"("target_site_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ev_handle_offerta_vinta"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_evento_id uuid;
  derived_tipo text;
BEGIN
  IF NEW.stato = 'vinta' AND NEW.evento_id IS NULL THEN
    derived_tipo := CASE NEW.categoria_prodotto
      WHEN 'pvt_event' THEN 'pvt'
      WHEN 'public_event' THEN 'public'
      ELSE 'pvt'
    END;

    INSERT INTO public.ev_eventi (
      site_id, offerta_id, cliente_id, titolo, tipo_evento,
      categoria_prodotto, stato_plan, data_evento, ricavo_previsto, lat, lng
    ) VALUES (
      NEW.site_id, NEW.id, NEW.cliente_id, NEW.titolo, derived_tipo,
      NEW.categoria_prodotto, 'to_plan', NEW.data_evento_prevista, NEW.importo_offerto, NEW.lat, NEW.lng
    )
    RETURNING id INTO new_evento_id;

    NEW.evento_id := new_evento_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ev_handle_offerta_vinta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") RETURNS TABLE("id" "uuid", "name" "text", "role" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY EXECUTE format('SELECT id, name, role FROM %I.users', schema_name);
END;
$$;


ALTER FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_sequence_value"("p_site_id" "uuid", "p_sequence_type" "text", "p_year" integer DEFAULT (EXTRACT(year FROM "now"()))::integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_next_value INTEGER;
BEGIN
    INSERT INTO "public"."code_sequences" (site_id, sequence_type, year, current_value, category_id)
    VALUES (p_site_id, p_sequence_type, p_year, 1, NULL)
    ON CONFLICT (site_id, sequence_type, year) WHERE category_id IS NULL
    DO UPDATE SET
        current_value = code_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO v_next_value;

    RETURN v_next_value;
END;
$$;


ALTER FUNCTION "public"."get_next_sequence_value"("p_site_id" "uuid", "p_sequence_type" "text", "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_users"("org_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "given_name" "text", "family_name" "text", "role" "text", "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT uo.user_id, u.email, up.given_name, up.family_name, up.role, uo.created_at
    FROM "public"."user_organizations" uo
    JOIN "auth"."users" u ON uo.user_id = u.id
    JOIN "public"."User" up ON u.id = up.auth_id
    WHERE uo.organization_id = org_uuid;
END;
$$;


ALTER FUNCTION "public"."get_organization_users"("org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_site_id_from_storage_path"("path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Extract the first segment (site_id) from the path
  RETURN (string_to_array(path, '/'))[1]::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_site_id_from_storage_path"("path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT uo.organization_id, o.name, uo.created_at
    FROM "public"."user_organizations" uo
    JOIN "public"."organizations" o ON uo.organization_id = o.id
    WHERE uo.user_id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  table_name text;
  user_db_id integer;
BEGIN
  -- First, get the User.id from authId for cascade deletions on User-related tables
  BEGIN
    SELECT id INTO user_db_id FROM "User" WHERE "authId" = OLD.id;
  EXCEPTION WHEN OTHERS THEN
    user_db_id := NULL;
  END;

  -- Delete from junction tables that reference auth.users.id directly
  -- These tables have user_id column pointing to auth.users.id (UUID)
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'user_organizations',
      'user_sites',
      'time_tracking',
      'error_tracking'
    ])
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE user_id = $1', table_name) USING OLD.id;
      RAISE NOTICE 'Deleted from % where user_id = %', table_name, OLD.id;
    EXCEPTION 
      WHEN undefined_table THEN
        NULL; -- Table doesn't exist, skip
      WHEN undefined_column THEN
        NULL; -- Column doesn't exist, skip
      WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from %: %', table_name, SQLERRM;
    END;
  END LOOP;

  -- Delete from _RolesToUser if we have the User.id
  -- This table uses User.id (integer) not auth.users.id (UUID)
  IF user_db_id IS NOT NULL THEN
    BEGIN
      DELETE FROM "_RolesToUser" WHERE "B" = user_db_id;
      RAISE NOTICE 'Deleted from _RolesToUser where B = %', user_db_id;
    EXCEPTION 
      WHEN undefined_table THEN
        NULL;
      WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from _RolesToUser: %', SQLERRM;
    END;
  END IF;

  -- Delete from User table (this should cascade to _RolesToUser via FK)
  BEGIN
    DELETE FROM "User" WHERE "authId" = OLD.id OR "auth_id" = OLD.id;
    RAISE NOTICE 'Deleted from User table where authId/auth_id = %', OLD.id;
  EXCEPTION 
    WHEN undefined_table THEN
      NULL; -- Table doesn't exist
    WHEN undefined_column THEN
      -- Try with just authId if auth_id doesn't exist
      BEGIN
        DELETE FROM "User" WHERE "authId" = OLD.id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    WHEN OTHERS THEN
      RAISE WARNING 'Error deleting from User table: %', SQLERRM;
  END;

  -- Log the deletion for audit purposes
  BEGIN
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      old_data,
      timestamp,
      user_id
    ) VALUES (
      'DELETE',
      'auth.users',
      OLD.id::text,
      jsonb_build_object(
        'email', OLD.email,
        'deleted_at', NOW(),
        'user_db_id', user_db_id
      ),
      NOW(),
      COALESCE(auth.uid()::text, 'system')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create audit log: %', SQLERRM;
  END;

  RETURN OLD;
END;
$_$;


ALTER FUNCTION "public"."handle_user_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    EXECUTE format('INSERT INTO %I.users (id, name, lastName, role) VALUES ($1, $2, $3)', schema_name)
    USING user_id, first_name, last_name, 'admin';
END;
$_$;


ALTER FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_in_organization"("user_uuid" "uuid", "org_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "public"."user_organizations" 
        WHERE user_id = user_uuid AND organization_id = org_uuid
    );
END;
$$;


ALTER FUNCTION "public"."is_user_in_organization"("user_uuid" "uuid", "org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_can_manage_access"("target_site_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    public.pm_is_superadmin()
    OR (
      public.user_can_access_site(target_site_id)
      AND EXISTS (
        SELECT 1 FROM public."User" u
        WHERE u."authId" = auth.uid()::text
          AND u.role IN ('admin', 'superadmin')
      )
    );
$$;


ALTER FUNCTION "public"."pm_can_manage_access"("target_site_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_is_superadmin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" u
    WHERE u."authId" = auth.uid()::text
      AND u.role = 'superadmin'
  );
$$;


ALTER FUNCTION "public"."pm_is_superadmin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_record_item_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.pm_item_snapshots (item_id, site_id, user_id, status, priority)
    VALUES (NEW.id, NEW.site_id, NEW.user_id, NEW.status, NEW.priority);
    RETURN NEW;
  END IF;

  -- UPDATE: registra solo se cambia stato o priorita'
  IF (NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.priority IS DISTINCT FROM OLD.priority) THEN
    INSERT INTO public.pm_item_snapshots (item_id, site_id, user_id, status, priority)
    VALUES (NEW.id, NEW.site_id, NEW.user_id, NEW.status, NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."pm_record_item_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_seed_life_areas"("target_site_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.pm_life_areas (site_id, slug, label, accent_color, sort_order)
  VALUES
    (target_site_id, 'career',    'Career',               '#F5921B', 1),
    (target_site_id, 'finance',   'Finance',              '#F2C218', 2),
    (target_site_id, 'family',    'Family',               '#57B947', 3),
    (target_site_id, 'health',    'Health',               '#2FBFA4', 4),
    (target_site_id, 'fun',       'Fun & Recreation',     '#39B7E4', 5),
    (target_site_id, 'friends',   'Friends',              '#6E77D8', 6),
    (target_site_id, 'growth',    'Personal Development', '#B061D4', 7),
    (target_site_id, 'spiritual', 'Spiritual',            '#F0736A', 8)
  ON CONFLICT (site_id, slug) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."pm_seed_life_areas"("target_site_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pm_seed_life_areas_on_site"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.pm_seed_life_areas(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."pm_seed_life_areas_on_site"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_demo_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_demo_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_documenti_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_documenti_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dashboard_3d_scenes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_dashboard_3d_scenes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kanban_category_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kanban_category_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_site_ai_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_site_ai_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_organizations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_organizations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_site"("target_site_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_sites us
      WHERE us.site_id = target_site_id
        AND us.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.sites s
      INNER JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE s.id = target_site_id
        AND uo.user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."user_can_access_site"("target_site_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Action" (
    "id" integer NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "supplierId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "taskId" integer,
    "clientId" integer,
    "productId" integer,
    "site_id" "uuid",
    "organization_id" "uuid",
    "user_id" "text"
);


ALTER TABLE "public"."Action" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Action_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Action_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Action_id_seq" OWNED BY "public"."Action"."id";



CREATE TABLE IF NOT EXISTS "public"."Checklist_item" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL
);


ALTER TABLE "public"."Checklist_item" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Checklist_item_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Checklist_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Checklist_item_id_seq" OWNED BY "public"."Checklist_item"."id";



CREATE TABLE IF NOT EXISTS "public"."Client" (
    "id" integer NOT NULL,
    "clientType" "public"."ClientType" DEFAULT 'BUSINESS'::"public"."ClientType" NOT NULL,
    "clientLanguage" "text",
    "individualTitle" "text",
    "individualFirstName" "text",
    "individualLastName" "text",
    "businessName" "text",
    "mobilePhone" "text",
    "landlinePhone" "text",
    "email" "text",
    "countryCode" "text",
    "zipCode" integer,
    "city" "text",
    "address" "text",
    "addressExtra" "text",
    "code" "text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "organization_id" "uuid",
    "site_id" "uuid",
    "addressSecondary" "text",
    "contactPeople" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "logoUrl" "text"
);


ALTER TABLE "public"."Client" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Client"."addressSecondary" IS 'Secondary address line (c/o, floor, apartment, etc.)';



COMMENT ON COLUMN "public"."Client"."contactPeople" IS 'Elenco dei referenti del cliente con ruolo, email e telefono';



COMMENT ON COLUMN "public"."Client"."logoUrl" IS 'URL pubblico del logo del cliente (bucket document-assets, path {site_id}/clients/{client_id}/logo.*)';



CREATE TABLE IF NOT EXISTS "public"."ClientAddress" (
    "id" integer NOT NULL,
    "countryCode" "text",
    "name" "text",
    "lastName" "text",
    "mobile" "text",
    "phone" "text",
    "email" "text",
    "zipCode" integer,
    "city" "text",
    "address" "text",
    "addressExtra" "text",
    "typeDetail" "text",
    "latitude" double precision,
    "longitude" double precision,
    "type" "public"."ClientAddressType" DEFAULT 'CONSTRUCTION_SITE'::"public"."ClientAddressType" NOT NULL,
    "clientId" integer
);


ALTER TABLE "public"."ClientAddress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ClientAddress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ClientAddress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ClientAddress_id_seq" OWNED BY "public"."ClientAddress"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Client_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Client_id_seq" OWNED BY "public"."Client"."id";



CREATE TABLE IF NOT EXISTS "public"."Department" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "description" character varying NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."Department" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Department_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Department_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Department_id_seq" OWNED BY "public"."Department"."id";



CREATE TABLE IF NOT EXISTS "public"."Errortracking" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "error_type" character varying NOT NULL,
    "error_category" "text" NOT NULL,
    "task_id" integer NOT NULL,
    "supplier_id" integer,
    "employee_id" integer NOT NULL,
    "position" "text",
    "description" character varying NOT NULL,
    "site_id" "uuid",
    "material_cost" numeric(10,2),
    "time_spent_hours" numeric(6,2),
    "transfer_km" numeric(8,2)
);


ALTER TABLE "public"."Errortracking" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Errortracking"."position" IS 'Posizione (opzionale)';



COMMENT ON COLUMN "public"."Errortracking"."material_cost" IS 'Costo materiale in CHF';



COMMENT ON COLUMN "public"."Errortracking"."time_spent_hours" IS 'Tempo impiegato in ore';



COMMENT ON COLUMN "public"."Errortracking"."transfer_km" IS 'KM trasferta supplementare';



CREATE SEQUENCE IF NOT EXISTS "public"."Errortracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Errortracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Errortracking_id_seq" OWNED BY "public"."Errortracking"."id";



CREATE TABLE IF NOT EXISTS "public"."Exit_checklist" (
    "id" integer NOT NULL,
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "name" character varying NOT NULL,
    "task_id" integer NOT NULL,
    "employee_id" integer NOT NULL,
    "position" character varying NOT NULL,
    "date" timestamp(6) without time zone NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."Exit_checklist" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Exit_checklist_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Exit_checklist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Exit_checklist_id_seq" OWNED BY "public"."Exit_checklist"."id";



CREATE TABLE IF NOT EXISTS "public"."File" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "cloudinaryId" "text",
    "taskId" integer,
    "errortrackingId" integer,
    "storage_path" "text",
    "sellProductId" integer
);


ALTER TABLE "public"."File" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."File_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."File_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."File_id_seq" OWNED BY "public"."File"."id";



CREATE TABLE IF NOT EXISTS "public"."Kanban" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "color" "text",
    "site_id" "uuid",
    "category_id" integer,
    "is_offer_kanban" boolean DEFAULT false,
    "target_work_kanban_id" integer,
    "is_work_kanban" boolean DEFAULT false,
    "is_production_kanban" boolean DEFAULT false,
    "target_invoice_kanban_id" integer,
    "icon" "text",
    "code_change_column_id" integer,
    "show_category_colors" boolean DEFAULT false,
    "card_field_config" "jsonb"
);


ALTER TABLE "public"."Kanban" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Kanban"."is_offer_kanban" IS 'Se true, questa kanban è per gestione offerte con logica speciale';



COMMENT ON COLUMN "public"."Kanban"."target_work_kanban_id" IS 'Kanban destinazione dove creare task quando offerta vinta';



COMMENT ON COLUMN "public"."Kanban"."is_work_kanban" IS 'Se true, questa kanban è per gestione lavori con routing verso produzione';



COMMENT ON COLUMN "public"."Kanban"."is_production_kanban" IS 'Se true, questa kanban è per produzione con routing verso fatturazione';



COMMENT ON COLUMN "public"."Kanban"."target_invoice_kanban_id" IS 'Kanban destinazione dove spostare task quando completata produzione';



COMMENT ON COLUMN "public"."Kanban"."icon" IS 'Lucide icon name for the kanban board';



COMMENT ON COLUMN "public"."Kanban"."code_change_column_id" IS 'ID of the column that triggers unique_code change from OFFERTA to LAVORO format';



COMMENT ON COLUMN "public"."Kanban"."card_field_config" IS 'Configura i campi visibili nelle card (versione estesa/ridotta) per kanban';



CREATE TABLE IF NOT EXISTS "public"."KanbanCategory" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "identifier" character varying(100) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "color" character varying(50),
    "site_id" "uuid",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_internal" boolean DEFAULT false,
    "internal_base_code" integer,
    CONSTRAINT "kanban_category_internal_base_check" CHECK ((("is_internal" = false) OR ("internal_base_code" IS NOT NULL)))
);


ALTER TABLE "public"."KanbanCategory" OWNER TO "postgres";


COMMENT ON COLUMN "public"."KanbanCategory"."is_internal" IS 'If true, this category uses internal project numbering (e.g., 1000-1, 1000-2)';



COMMENT ON COLUMN "public"."KanbanCategory"."internal_base_code" IS 'Base code for internal project numbers (e.g., 1000 for Marketing, 2000 for R&D)';



CREATE SEQUENCE IF NOT EXISTS "public"."KanbanCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."KanbanCategory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."KanbanCategory_id_seq" OWNED BY "public"."KanbanCategory"."id";



CREATE TABLE IF NOT EXISTS "public"."KanbanColumn" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "position" integer NOT NULL,
    "kanbanId" integer NOT NULL,
    "tasks" integer,
    "icon" "text",
    "column_type" "text" DEFAULT 'normal'::"text",
    "is_creation_column" boolean DEFAULT false,
    CONSTRAINT "kanbancolumn_column_type_check" CHECK (("column_type" = ANY (ARRAY['normal'::"text", 'won'::"text", 'lost'::"text", 'production'::"text", 'invoicing'::"text"])))
);


ALTER TABLE "public"."KanbanColumn" OWNER TO "postgres";


COMMENT ON COLUMN "public"."KanbanColumn"."column_type" IS 'Tipo colonna: normal, won (vinta), lost (persa)';



COMMENT ON COLUMN "public"."KanbanColumn"."is_creation_column" IS 'Flag to indicate which column shows the create button. Only one column per kanban should have this set to true.';



COMMENT ON CONSTRAINT "kanbancolumn_column_type_check" ON "public"."KanbanColumn" IS 'Tipi colonna: normal, won (vinta), lost (persa), production (routing produzione), invoicing (routing fatturazione)';



CREATE SEQUENCE IF NOT EXISTS "public"."KanbanColumn_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."KanbanColumn_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."KanbanColumn_id_seq" OWNED BY "public"."KanbanColumn"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Kanban_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Kanban_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Kanban_id_seq" OWNED BY "public"."Kanban"."id";



CREATE TABLE IF NOT EXISTS "public"."Manufacturer" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "short_name" character varying(100),
    "description" "text",
    "address" "text",
    "cap" integer,
    "location" "text",
    "website" "text",
    "email" "text",
    "phone" "text",
    "contact" "text",
    "manufacturer_image" character varying(500),
    "manufacturer_category_id" integer,
    "site_id" "uuid",
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Manufacturer" OWNER TO "postgres";


COMMENT ON TABLE "public"."Manufacturer" IS 'Manufacturers/Producers table';



CREATE TABLE IF NOT EXISTS "public"."Manufacturer_category" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(50),
    "description" character varying(500) NOT NULL,
    "site_id" "uuid",
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Manufacturer_category" OWNER TO "postgres";


COMMENT ON TABLE "public"."Manufacturer_category" IS 'Categories for manufacturers';



CREATE SEQUENCE IF NOT EXISTS "public"."Manufacturer_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Manufacturer_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Manufacturer_category_id_seq" OWNED BY "public"."Manufacturer_category"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Manufacturer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Manufacturer_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Manufacturer_id_seq" OWNED BY "public"."Manufacturer"."id";



CREATE TABLE IF NOT EXISTS "public"."PackingControl" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "passed" "public"."QC_Status" DEFAULT 'NOT_DONE'::"public"."QC_Status" NOT NULL,
    "taskId" integer NOT NULL,
    "userId" integer NOT NULL,
    "site_id" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."PackingControl" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."PackingControl_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."PackingControl_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."PackingControl_id_seq" OWNED BY "public"."PackingControl"."id";



CREATE TABLE IF NOT EXISTS "public"."PackingItem" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "number" integer,
    "package_quantity" integer,
    "packingControlId" integer NOT NULL
);


ALTER TABLE "public"."PackingItem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."PackingItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."PackingItem_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."PackingItem_id_seq" OWNED BY "public"."PackingItem"."id";



CREATE TABLE IF NOT EXISTS "public"."PackingMasterItem" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."PackingMasterItem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."PackingMasterItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."PackingMasterItem_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."PackingMasterItem_id_seq" OWNED BY "public"."PackingMasterItem"."id";



CREATE TABLE IF NOT EXISTS "public"."Product" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "inventoryId" integer NOT NULL,
    "type" character varying,
    "description" character varying DEFAULT ''::character varying,
    "supplier" character varying DEFAULT ''::character varying,
    "unit_price" double precision NOT NULL,
    "unit" "text",
    "length" double precision,
    "total_price" double precision,
    "width" double precision,
    "height" double precision,
    "quantity" double precision NOT NULL,
    "supplierId" integer,
    "categoryId" integer,
    "site_id" "uuid",
    "category" "text",
    "category_code" "text",
    "subcategory" "text",
    "subcategory_code" "text",
    "subcategory2" "text",
    "subcategory2_code" "text",
    "color" "text",
    "color_code" "text",
    "internal_code" "text",
    "warehouse_number" "text",
    "supplier_code" "text",
    "producer" "text",
    "producer_code" "text",
    "url_tds" "text",
    "image_url" "text",
    "thickness" double precision,
    "diameter" double precision,
    "sell_price" double precision
);


ALTER TABLE "public"."Product" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Product"."category" IS 'Main category name (CAT from CSV)';



COMMENT ON COLUMN "public"."Product"."category_code" IS 'Main category code (COD_CAT from CSV)';



COMMENT ON COLUMN "public"."Product"."subcategory" IS 'Subcategory name (S_CAT from CSV)';



COMMENT ON COLUMN "public"."Product"."subcategory_code" IS 'Subcategory code (COD_S_CAT from CSV)';



COMMENT ON COLUMN "public"."Product"."subcategory2" IS 'Secondary subcategory name (S_CAT_2 from CSV)';



COMMENT ON COLUMN "public"."Product"."subcategory2_code" IS 'Secondary subcategory code (COD_S_CAT_2 from CSV)';



COMMENT ON COLUMN "public"."Product"."color" IS 'Color name (COLORE from CSV)';



COMMENT ON COLUMN "public"."Product"."color_code" IS 'Color code (COD_COLORE from CSV)';



COMMENT ON COLUMN "public"."Product"."internal_code" IS 'Unique internal product code (COD_INT from CSV)';



COMMENT ON COLUMN "public"."Product"."warehouse_number" IS 'Warehouse/location number (NR_MAG from CSV)';



COMMENT ON COLUMN "public"."Product"."supplier_code" IS 'Supplier code (COD_FORN from CSV)';



COMMENT ON COLUMN "public"."Product"."producer" IS 'Producer/manufacturer name (PRODUTTORE from CSV)';



COMMENT ON COLUMN "public"."Product"."producer_code" IS 'Producer code (COD_PROD from CSV)';



COMMENT ON COLUMN "public"."Product"."url_tds" IS 'Technical data sheet URL (URL_TDS from CSV)';



COMMENT ON COLUMN "public"."Product"."image_url" IS 'Product image URL (URL_IMM from CSV)';



COMMENT ON COLUMN "public"."Product"."thickness" IS 'Product thickness (SPESSORE from CSV)';



COMMENT ON COLUMN "public"."Product"."diameter" IS 'Product diameter (DIAMETRO from CSV)';



COMMENT ON COLUMN "public"."Product"."sell_price" IS 'Selling price in CHF (CHF_VENDITA from CSV)';



CREATE TABLE IF NOT EXISTS "public"."Product_category" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "description" character varying NOT NULL,
    "site_id" "uuid",
    "code" "text"
);


ALTER TABLE "public"."Product_category" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Product_category"."code" IS 'Category code (e.g., LG for LEGNO)';



CREATE SEQUENCE IF NOT EXISTS "public"."Product_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Product_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_category_id_seq" OWNED BY "public"."Product_category"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Product_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_id_seq" OWNED BY "public"."Product"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Product_inventoryId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Product_inventoryId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_inventoryId_seq" OWNED BY "public"."Product"."inventoryId";



CREATE TABLE IF NOT EXISTS "public"."QcMasterItem" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."QcMasterItem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."QcMasterItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."QcMasterItem_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."QcMasterItem_id_seq" OWNED BY "public"."QcMasterItem"."id";



CREATE TABLE IF NOT EXISTS "public"."Qc_item" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "qualityControlId" integer,
    "checked" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."Qc_item" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Qc_item_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Qc_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Qc_item_id_seq" OWNED BY "public"."Qc_item"."id";



CREATE TABLE IF NOT EXISTS "public"."QualityControl" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "position_nr" "text" NOT NULL,
    "passed" "public"."QC_Status" DEFAULT 'NOT_DONE'::"public"."QC_Status" NOT NULL,
    "taskId" integer NOT NULL,
    "userId" integer NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."QualityControl" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."QualityControl_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."QualityControl_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."QualityControl_id_seq" OWNED BY "public"."QualityControl"."id";



CREATE TABLE IF NOT EXISTS "public"."Reseller" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "contact_person" character varying(255),
    "country" character varying(100),
    "country_code" character varying(2),
    "address" "text",
    "zip_city" character varying(255),
    "phone" "text",
    "fax" "text",
    "mobile" "text",
    "email" "text",
    "website" "text",
    "notes" "text",
    "site_id" "uuid",
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Reseller" OWNER TO "postgres";


COMMENT ON TABLE "public"."Reseller" IS 'Resellers/distributors per country';



CREATE SEQUENCE IF NOT EXISTS "public"."Reseller_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Reseller_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Reseller_id_seq" OWNED BY "public"."Reseller"."id";



CREATE TABLE IF NOT EXISTS "public"."Roles" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."Roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Roles_id_seq" OWNED BY "public"."Roles"."id";



CREATE TABLE IF NOT EXISTS "public"."SellProduct" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "active" boolean DEFAULT true NOT NULL,
    "site_id" "uuid",
    "description" "text",
    "price_list" boolean DEFAULT false,
    "image_url" "text",
    "doc_url" "text",
    "internal_code" "text",
    "category_id" integer,
    "subcategory" "text",
    "product_type" "text",
    "supplier_id" integer,
    "tipo" "text",
    "unit" "text",
    "list_price" numeric,
    "diameter_mm" numeric,
    "length_mm" numeric
);


ALTER TABLE "public"."SellProduct" OWNER TO "postgres";


COMMENT ON COLUMN "public"."SellProduct"."name" IS 'Categoria del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."type" IS 'Sottocategoria del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."description" IS 'Descrizione del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."price_list" IS 'Incluso nel listino prezzi';



COMMENT ON COLUMN "public"."SellProduct"."image_url" IS 'URL immagine del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."doc_url" IS 'URL cartella documenti del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."internal_code" IS 'Codice interno univoco per import CSV';



COMMENT ON COLUMN "public"."SellProduct"."category_id" IS 'Riferimento alla categoria del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."subcategory" IS 'Sottocategoria del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."product_type" IS 'Tipo del prodotto';



COMMENT ON COLUMN "public"."SellProduct"."supplier_id" IS 'Fornitore associato al prodotto';



COMMENT ON COLUMN "public"."SellProduct"."tipo" IS 'Tipo del prodotto (nuovo campo nativo, compatibile con product_type legacy)';



COMMENT ON COLUMN "public"."SellProduct"."unit" IS 'Unita di misura catalogo (m1, Pz., h, mq, ml, kg, forfait)';



COMMENT ON COLUMN "public"."SellProduct"."list_price" IS 'Prezzo di listino per generatore documenti';



COMMENT ON COLUMN "public"."SellProduct"."diameter_mm" IS 'Diametro del prodotto in millimetri (opzionale)';



COMMENT ON COLUMN "public"."SellProduct"."length_mm" IS 'Lunghezza del prodotto in millimetri (opzionale)';



CREATE SEQUENCE IF NOT EXISTS "public"."SellProduct_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."SellProduct_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."SellProduct_id_seq" OWNED BY "public"."SellProduct"."id";



CREATE TABLE IF NOT EXISTS "public"."Supplier" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "address" "text",
    "cap" integer,
    "location" "text",
    "website" "text",
    "email" "text",
    "phone" "text",
    "contact" "text",
    "description" character varying NOT NULL,
    "supplier_image" character varying,
    "short_name" "text",
    "site_id" "uuid",
    "supplier_category_id" integer
);


ALTER TABLE "public"."Supplier" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Supplier_category" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(50),
    "description" character varying(500) NOT NULL,
    "site_id" "uuid",
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Supplier_category" OWNER TO "postgres";


COMMENT ON TABLE "public"."Supplier_category" IS 'Categories for suppliers, similar to Product_category';



CREATE SEQUENCE IF NOT EXISTS "public"."Supplier_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Supplier_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Supplier_category_id_seq" OWNED BY "public"."Supplier_category"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Supplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Supplier_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Supplier_id_seq" OWNED BY "public"."Supplier"."id";



CREATE TABLE IF NOT EXISTS "public"."Task" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "title" character varying,
    "column_id" integer,
    "column_position" integer,
    "unique_code" "text",
    "archived" boolean DEFAULT false NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "status" "text",
    "deliveryDate" timestamp(6) without time zone,
    "kanbanColumnId" integer,
    "clientId" integer,
    "kanbanId" integer,
    "other" "text",
    "sellPrice" double precision,
    "material" boolean DEFAULT false NOT NULL,
    "percentStatus" integer DEFAULT 0,
    "positions" "text"[],
    "sellProductId" integer,
    "userId" integer,
    "ferramenta" boolean DEFAULT false NOT NULL,
    "metalli" boolean DEFAULT false NOT NULL,
    "name" character varying,
    "stoccato" boolean DEFAULT false,
    "stoccaggiodate" timestamp(6) without time zone,
    "legno" boolean,
    "vernice" boolean,
    "altro" boolean,
    "site_id" "uuid",
    "termine_produzione" "date",
    "numero_pezzi" numeric,
    "parent_task_id" integer,
    "task_type" "text" DEFAULT 'LAVORO'::"text",
    "display_mode" "text" DEFAULT 'normal'::"text",
    "auto_archive_at" timestamp without time zone,
    "sent_date" timestamp with time zone,
    "is_draft" boolean DEFAULT false,
    "draft_category_ids" integer[],
    "luogo" "text",
    "cloud_folder_url" "text",
    "project_files_url" "text",
    "ora_inizio" time without time zone,
    "ora_fine" time without time zone,
    "squadra" integer,
    "source_offer_code" "text",
    "consuntivo_material_cost" numeric(10,2) DEFAULT 0,
    "consuntivo_default_hourly_rate" numeric(10,2) DEFAULT 65,
    "consuntivo_collaborator_rates" "jsonb" DEFAULT '{}'::"jsonb",
    "offer_send_date" "date",
    "offer_products" "jsonb" DEFAULT '[]'::"jsonb",
    "offer_followups" "jsonb" DEFAULT '[]'::"jsonb",
    "offer_loss_reason" "text",
    "offer_loss_competitor_name" "text",
    "produzione_data_inizio" "date",
    "produzione_data_fine" "date",
    "posa_data_inizio" "date",
    "posa_data_fine" "date",
    "produzione_ora_inizio" time without time zone,
    "produzione_ora_fine" time without time zone,
    "posa_ora_inizio" time without time zone,
    "posa_ora_fine" time without time zone,
    "assigned_collaborator_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "produzione_collaborator_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "posa_collaborator_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "service_data_inizio" "date",
    "service_data_fine" "date",
    "service_ora_inizio" time without time zone,
    "service_ora_fine" time without time zone,
    "service_collaborator_ids" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "Task_squadra_check" CHECK ((("squadra" IS NULL) OR ("squadra" = ANY (ARRAY[1, 2]))))
);


ALTER TABLE "public"."Task" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Task"."legno" IS 'Wood material required flag';



COMMENT ON COLUMN "public"."Task"."vernice" IS 'Paint material required flag';



COMMENT ON COLUMN "public"."Task"."altro" IS 'Other material required flag';



COMMENT ON COLUMN "public"."Task"."termine_produzione" IS 'Production deadline date';



COMMENT ON COLUMN "public"."Task"."numero_pezzi" IS 'Number of pieces for the project';



COMMENT ON COLUMN "public"."Task"."parent_task_id" IS 'Riferimento al task padre (es. offerta che ha generato questo lavoro)';



COMMENT ON COLUMN "public"."Task"."task_type" IS 'Tipo task: OFFERTA, LAVORO, FATTURA, etc.';



COMMENT ON COLUMN "public"."Task"."display_mode" IS 'Modalità visualizzazione: normal, small_green, small_red';



COMMENT ON COLUMN "public"."Task"."auto_archive_at" IS 'Data/ora per auto-archiviazione task';



COMMENT ON COLUMN "public"."Task"."sent_date" IS 'Date when offer was sent to client. Used in offer kanbans to track follow-up timing.';



COMMENT ON COLUMN "public"."Task"."is_draft" IS 'Flag for draft offers created via quick add. Draft offers need to be completed before moving out of TODO column.';



COMMENT ON COLUMN "public"."Task"."draft_category_ids" IS 'Array of sellproduct_categories IDs selected during draft offer creation. Used to filter products when completing the draft.';



COMMENT ON COLUMN "public"."Task"."luogo" IS 'Location/address where the task/project will be delivered or installed';



COMMENT ON COLUMN "public"."Task"."cloud_folder_url" IS 'URL to cloud folder for project documents';



COMMENT ON COLUMN "public"."Task"."project_files_url" IS 'URL to folder containing project files';



COMMENT ON COLUMN "public"."Task"."ora_inizio" IS 'Ora inizio (per calendari Posa/Service, 06:00-20:00)';



COMMENT ON COLUMN "public"."Task"."ora_fine" IS 'Ora fine (per calendari Posa/Service)';



COMMENT ON COLUMN "public"."Task"."squadra" IS 'Squadra 1 o 2 (per calendari Posa/Service)';



COMMENT ON COLUMN "public"."Task"."source_offer_code" IS 'Codice offerta originale da cui deriva questo lavoro';



COMMENT ON COLUMN "public"."Task"."consuntivo_material_cost" IS 'Costo materiale extra inserito manualmente nel consuntivo progetto.';



COMMENT ON COLUMN "public"."Task"."consuntivo_default_hourly_rate" IS 'Tariffa oraria base usata nel consuntivo progetto.';



COMMENT ON COLUMN "public"."Task"."consuntivo_collaborator_rates" IS 'Mappa JSON dei costi orari personalizzati per collaboratore nel consuntivo progetto.';



COMMENT ON COLUMN "public"."Task"."offer_send_date" IS 'Indicative date when the offer should be sent.';



COMMENT ON COLUMN "public"."Task"."offer_products" IS 'Structured lines of the offer including product, quantity, price and description.';



COMMENT ON COLUMN "public"."Task"."offer_followups" IS 'Structured follow-up history for offer negotiation contacts.';



COMMENT ON COLUMN "public"."Task"."offer_loss_reason" IS 'Reason why an offer was lost.';



COMMENT ON COLUMN "public"."Task"."offer_loss_competitor_name" IS 'Competitor name when the lost offer was awarded to competition.';



COMMENT ON COLUMN "public"."Task"."produzione_data_inizio" IS 'Data inizio produzione';



COMMENT ON COLUMN "public"."Task"."produzione_data_fine" IS 'Data fine produzione';



COMMENT ON COLUMN "public"."Task"."posa_data_inizio" IS 'Data inizio posa';



COMMENT ON COLUMN "public"."Task"."posa_data_fine" IS 'Data fine posa';



COMMENT ON COLUMN "public"."Task"."produzione_ora_inizio" IS 'Ora inizio produzione';



COMMENT ON COLUMN "public"."Task"."produzione_ora_fine" IS 'Ora fine produzione';



COMMENT ON COLUMN "public"."Task"."posa_ora_inizio" IS 'Ora inizio posa';



COMMENT ON COLUMN "public"."Task"."posa_ora_fine" IS 'Ora fine posa';



COMMENT ON COLUMN "public"."Task"."assigned_collaborator_ids" IS 'Elenco collaboratori assegnati (User.id)';



COMMENT ON COLUMN "public"."Task"."produzione_collaborator_ids" IS 'Collaboratori assegnati alla produzione (User.id)';



COMMENT ON COLUMN "public"."Task"."posa_collaborator_ids" IS 'Collaboratori assegnati alla posa (User.id)';



COMMENT ON COLUMN "public"."Task"."service_data_inizio" IS 'Data inizio assistenza/service';



COMMENT ON COLUMN "public"."Task"."service_data_fine" IS 'Data fine assistenza/service';



COMMENT ON COLUMN "public"."Task"."service_ora_inizio" IS 'Ora inizio assistenza/service';



COMMENT ON COLUMN "public"."Task"."service_ora_fine" IS 'Ora fine assistenza/service';



COMMENT ON COLUMN "public"."Task"."service_collaborator_ids" IS 'Collaboratori assegnati al service (User.id)';



CREATE TABLE IF NOT EXISTS "public"."TaskHistory" (
    "id" integer NOT NULL,
    "taskId" integer NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."TaskHistory" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."TaskHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."TaskHistory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."TaskHistory_id_seq" OWNED BY "public"."TaskHistory"."id";



CREATE TABLE IF NOT EXISTS "public"."TaskSupplier" (
    "id" integer NOT NULL,
    "taskId" integer NOT NULL,
    "supplierId" integer NOT NULL,
    "deliveryDate" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "notes" "text",
    "orderDate" timestamp without time zone,
    "supplyDays" integer
);


ALTER TABLE "public"."TaskSupplier" OWNER TO "postgres";


COMMENT ON COLUMN "public"."TaskSupplier"."notes" IS 'Notes for this supplier order';



COMMENT ON COLUMN "public"."TaskSupplier"."orderDate" IS 'Order date for a supplier line attached to a task.';



COMMENT ON COLUMN "public"."TaskSupplier"."supplyDays" IS 'Lead time in days required before the target delivery date.';



CREATE SEQUENCE IF NOT EXISTS "public"."TaskSupplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."TaskSupplier_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."TaskSupplier_id_seq" OWNED BY "public"."TaskSupplier"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Task_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Task_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Task_id_seq" OWNED BY "public"."Task"."id";



CREATE TABLE IF NOT EXISTS "public"."Timetracking" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "description" character varying,
    "description_type" character varying DEFAULT 'EXTERNAL'::character varying NOT NULL,
    "task_id" integer,
    "employee_id" integer,
    "use_cnc" boolean NOT NULL,
    "endTime" timestamp without time zone,
    "startTime" timestamp without time zone,
    "totalTime" double precision NOT NULL,
    "hours" integer,
    "minutes" integer,
    "site_id" "uuid",
    "activity_type" character varying(20) DEFAULT 'project'::character varying,
    "internal_activity" character varying(50),
    "lunch_offsite" boolean DEFAULT false,
    "lunch_location" "text",
    CONSTRAINT "timetracking_activity_consistency_check" CHECK ((((("activity_type")::"text" = 'project'::"text") AND ("task_id" IS NOT NULL)) OR ((("activity_type")::"text" = 'internal'::"text") AND ("internal_activity" IS NOT NULL)))),
    CONSTRAINT "timetracking_activity_type_check" CHECK ((("activity_type")::"text" = ANY ((ARRAY['project'::character varying, 'internal'::character varying])::"text"[])))
);


ALTER TABLE "public"."Timetracking" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Timetracking"."activity_type" IS 'Type of activity: project (linked to task) or internal (standalone)';



COMMENT ON COLUMN "public"."Timetracking"."internal_activity" IS 'Type of internal activity: pulizie, manutenzione, logistica, inventario, formazione, riunione, altro';



CREATE SEQUENCE IF NOT EXISTS "public"."Timetracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Timetracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Timetracking_id_seq" OWNED BY "public"."Timetracking"."id";



CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "authId" "text",
    "given_name" "text",
    "family_name" "text",
    "initials" "text",
    "picture" "text",
    "color" "text",
    "enabled" boolean DEFAULT true NOT NULL,
    "auth_id" "uuid",
    "role" "text" DEFAULT 'user'::"text",
    "deactivated_at" "date",
    "company_role" "text",
    "assistance_level" "text" DEFAULT 'basic_tutorial'::"text" NOT NULL,
    "activation_status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "User_activation_status_check" CHECK (("activation_status" = ANY (ARRAY['draft'::"text", 'active'::"text"]))),
    CONSTRAINT "user_assistance_level_check" CHECK (("assistance_level" = ANY (ARRAY['basic_tutorial'::"text", 'smart_support'::"text", 'advanced_support'::"text"])))
);


ALTER TABLE "public"."User" OWNER TO "postgres";


COMMENT ON COLUMN "public"."User"."role" IS 'Global role of the user (superadmin, admin, user)';



COMMENT ON COLUMN "public"."User"."company_role" IS 'The user role within the company/organization (e.g., Manager, Developer, Operator). This is distinct from the system role which controls access permissions.';



COMMENT ON COLUMN "public"."User"."assistance_level" IS 'Per-user assistance UX level: basic_tutorial, smart_support, advanced_support.';



CREATE SEQUENCE IF NOT EXISTS "public"."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."User_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."User_id_seq" OWNED BY "public"."User"."id";



CREATE TABLE IF NOT EXISTS "public"."_RolesToTimetracking" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE "public"."_RolesToTimetracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_RolesToUser" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE "public"."_RolesToUser" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "auto_detected" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_entries_status_check" CHECK (("status" = ANY (ARRAY['presente'::"text", 'vacanze'::"text", 'malattia'::"text", 'infortunio'::"text", 'smart_working'::"text", 'formazione'::"text", 'assenza_privata'::"text", 'ipg'::"text"])))
);


ALTER TABLE "public"."attendance_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "user_id" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."code_sequences" (
    "id" integer NOT NULL,
    "site_id" "uuid" NOT NULL,
    "sequence_type" "text" NOT NULL,
    "year" integer NOT NULL,
    "current_value" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "category_id" integer
);


ALTER TABLE "public"."code_sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."code_sequences" IS 'Contatori incrementali per generazione codici task';



COMMENT ON COLUMN "public"."code_sequences"."category_id" IS 'Reference to KanbanCategory for internal project sequences';



CREATE SEQUENCE IF NOT EXISTS "public"."code_sequences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."code_sequences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."code_sequences_id_seq" OWNED BY "public"."code_sequences"."id";



CREATE TABLE IF NOT EXISTS "public"."dashboard_3d_scenes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "name" "text" DEFAULT 'Prima dashboard 3D'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "format" "text" DEFAULT 'b2_h1'::"text" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "scene_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "dashboard_3d_scenes_format_check" CHECK (("format" = 'b2_h1'::"text")),
    CONSTRAINT "dashboard_3d_scenes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."dashboard_3d_scenes" OWNER TO "postgres";


COMMENT ON TABLE "public"."dashboard_3d_scenes" IS 'Per-site 3D dashboard configuration in b2_h1 format.';



CREATE TABLE IF NOT EXISTS "public"."demo_access_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "access_token_id" "uuid",
    "event_type" "text" NOT NULL,
    "session_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "country" "text",
    "city" "text",
    "referrer" "text",
    "landing_path" "text",
    "redirect_path" "text",
    "customer_name_snapshot" "text",
    "customer_company_snapshot" "text",
    "event_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "demo_access_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['landing_view'::"text", 'cta_click'::"text", 'magic_link_generated'::"text", 'login_success'::"text", 'session_started'::"text", 'invalid_token'::"text", 'expired_token'::"text", 'revoked_token'::"text"])))
);


ALTER TABLE "public"."demo_access_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."demo_access_events" IS 'Analytics trail for landing views, magic-link generation and demo logins.';



CREATE TABLE IF NOT EXISTS "public"."demo_access_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "label" "text",
    "redirect_path" "text" DEFAULT '/dashboard'::"text" NOT NULL,
    "use_policy" "text" DEFAULT 'multi_use'::"text" NOT NULL,
    "max_uses" integer,
    "uses_count" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "demo_access_tokens_use_policy_check" CHECK (("use_policy" = ANY (ARRAY['single_use'::"text", 'multi_use'::"text"])))
);


ALTER TABLE "public"."demo_access_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."demo_access_tokens" IS 'Reusable or single-use QR/link tokens that grant access to a demo workspace.';



CREATE TABLE IF NOT EXISTS "public"."demo_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "demo_user_id" "uuid" NOT NULL,
    "template_key" "text" NOT NULL,
    "sector_key" "text" NOT NULL,
    "scenario_type" "text" DEFAULT 'full_suite'::"text" NOT NULL,
    "display_name" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_company" "text",
    "customer_contact_name" "text",
    "customer_contact_email" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "branding_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "landing_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "seed_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "first_landing_view_at" timestamp with time zone,
    "first_login_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone,
    "last_magic_link_at" timestamp with time zone,
    "last_ip_address" "inet",
    "last_user_agent" "text",
    "login_count" integer DEFAULT 0 NOT NULL,
    "landing_view_count" integer DEFAULT 0 NOT NULL,
    "magic_link_count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "demo_workspaces_status_check" CHECK (("status" = ANY (ARRAY['provisioning'::"text", 'active'::"text", 'expired'::"text", 'revoked'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."demo_workspaces" OWNER TO "postgres";


COMMENT ON TABLE "public"."demo_workspaces" IS 'Dedicated demo workspaces created for individual prospects or customers.';



CREATE TABLE IF NOT EXISTS "public"."documenti" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "task_id" integer,
    "tipo_documento" "text" NOT NULL,
    "numero" "text",
    "anno" integer,
    "cliente_id" integer,
    "destinatario" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "oggetto" "text",
    "condizioni_pagamento" "text"[] DEFAULT '{}'::"text"[],
    "termine_fornitura" "text",
    "note" "text",
    "tot_netto" numeric,
    "iva" numeric,
    "totale_chf" numeric,
    "source_text" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "corpo_testo" "text",
    "pdf_url" "text",
    "pdf_storage_path" "text",
    "allegati" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "documenti_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'final'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."documenti" OWNER TO "postgres";


COMMENT ON COLUMN "public"."documenti"."corpo_testo" IS 'Corpo prosa per lettere e comunicazioni';



COMMENT ON COLUMN "public"."documenti"."pdf_url" IS 'URL pubblico del PDF generato';



COMMENT ON COLUMN "public"."documenti"."pdf_storage_path" IS 'Path nel bucket documents';



COMMENT ON COLUMN "public"."documenti"."allegati" IS 'Array JSON allegati: [{name, url, storage_path, size}]';



CREATE TABLE IF NOT EXISTS "public"."ev_clienti" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "email" "text",
    "telefono" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_clienti_tipo_check" CHECK (("tipo" = ANY (ARRAY['privato'::"text", 'azienda'::"text", 'ente'::"text"])))
);


ALTER TABLE "public"."ev_clienti" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_eventi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "offerta_id" "uuid",
    "cliente_id" "uuid",
    "location_id" "uuid",
    "titolo" "text" NOT NULL,
    "tipo_evento" "text" NOT NULL,
    "categoria_prodotto" "text" NOT NULL,
    "stato_plan" "text" DEFAULT 'to_plan'::"text" NOT NULL,
    "stato_accounting" "text",
    "data_evento" "date",
    "ora_inizio" time without time zone,
    "ora_fine" time without time zone,
    "budget_previsto" numeric,
    "ricavo_previsto" numeric,
    "note" "text",
    "lat" numeric,
    "lng" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "senza_data" boolean DEFAULT false NOT NULL,
    "volo_brandizzato" boolean DEFAULT false NOT NULL,
    "immagine_url" "text",
    CONSTRAINT "ev_eventi_categoria_prodotto_check" CHECK (("categoria_prodotto" = ANY (ARRAY['pvt_event'::"text", 'public_event'::"text", 'other'::"text"]))),
    CONSTRAINT "ev_eventi_stato_accounting_check" CHECK (("stato_accounting" = ANY (ARRAY['invoice_in'::"text", 'invoice_out'::"text", 'balance'::"text", 'close'::"text"]))),
    CONSTRAINT "ev_eventi_stato_plan_check" CHECK (("stato_plan" = ANY (ARRAY['to_plan'::"text", 'planning'::"text", 'planned'::"text", 'confirmed'::"text", 'live'::"text", 'finish'::"text"]))),
    CONSTRAINT "ev_eventi_tipo_evento_check" CHECK (("tipo_evento" = ANY (ARRAY['pvt'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."ev_eventi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_eventi_fornitori" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "evento_id" "uuid" NOT NULL,
    "fornitore_id" "uuid" NOT NULL,
    "ruolo" "text",
    "stato_ingaggio" "text" DEFAULT 'da_contattare'::"text" NOT NULL,
    "costo" numeric,
    "rider_ricevuto" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_eventi_fornitori_stato_ingaggio_check" CHECK (("stato_ingaggio" = ANY (ARRAY['da_contattare'::"text", 'in_trattativa'::"text", 'confermato'::"text", 'pagato'::"text"])))
);


ALTER TABLE "public"."ev_eventi_fornitori" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_eventi_task" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "evento_id" "uuid" NOT NULL,
    "titolo" "text" NOT NULL,
    "stato" "text" DEFAULT 'da_fare'::"text" NOT NULL,
    "scadenza" "date",
    "assegnatario" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_eventi_task_stato_check" CHECK (("stato" = ANY (ARRAY['da_fare'::"text", 'in_corso'::"text", 'in_attesa_terzi'::"text", 'fatto'::"text"])))
);


ALTER TABLE "public"."ev_eventi_task" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_fatture" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "evento_id" "uuid",
    "direzione" "text" NOT NULL,
    "descrizione" "text",
    "importo" numeric NOT NULL,
    "stato" "text" DEFAULT 'aperta'::"text" NOT NULL,
    "data_scadenza" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_fatture_direzione_check" CHECK (("direzione" = ANY (ARRAY['in'::"text", 'out'::"text"]))),
    CONSTRAINT "ev_fatture_stato_check" CHECK (("stato" = ANY (ARRAY['aperta'::"text", 'pagata'::"text", 'incassata'::"text", 'stornata'::"text"])))
);


ALTER TABLE "public"."ev_fatture" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_fornitori" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "email" "text",
    "telefono" "text",
    "note" "text",
    "costo_indicativo" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_fornitori_categoria_check" CHECK (("categoria" = ANY (ARRAY['location'::"text", 'artisti'::"text", 'food'::"text", 'beverage'::"text", 'materials'::"text", 'marketing'::"text", 'staff_security'::"text"])))
);


ALTER TABLE "public"."ev_fornitori" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_location" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "indirizzo" "text",
    "citta" "text",
    "capienza" integer,
    "note_logistiche" "text",
    "contatto_referente" "text",
    "telefono" "text",
    "lat" numeric,
    "lng" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."ev_location" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ev_offerte" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "cliente_id" "uuid",
    "titolo" "text" NOT NULL,
    "categoria_prodotto" "text" NOT NULL,
    "stato" "text" DEFAULT 'richiesta'::"text" NOT NULL,
    "data_evento_prevista" "date",
    "importo_offerto" numeric,
    "note" "text",
    "evento_id" "uuid",
    "lat" numeric,
    "lng" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "ev_offerte_categoria_prodotto_check" CHECK (("categoria_prodotto" = ANY (ARRAY['pvt_event'::"text", 'public_event'::"text", 'other'::"text"]))),
    CONSTRAINT "ev_offerte_stato_check" CHECK (("stato" = ANY (ARRAY['richiesta'::"text", 'in_elaborazione'::"text", 'offerta_inviata'::"text", 'in_trattativa'::"text", 'vinta'::"text", 'persa'::"text"])))
);


ALTER TABLE "public"."ev_offerte" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."internal_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "site_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."internal_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."internal_activities" IS 'Attività interne per il timetracking (es. pulizie, manutenzione, amministrazione)';



CREATE TABLE IF NOT EXISTS "public"."inventory_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "code" "text",
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."inventory_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_categories" IS 'Categorie prodotti inventario per site';



CREATE TABLE IF NOT EXISTS "public"."inventory_item_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "internal_code" "text",
    "supplier_code" "text",
    "producer" "text",
    "producer_code" "text",
    "unit_id" "uuid",
    "purchase_unit_price" numeric,
    "sell_unit_price" numeric,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "image_url" "text",
    "url_tds" "text",
    "warehouse_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_item_variants" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_item_variants" IS 'Varianti articoli con attributi tecnici';



CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "item_type" "text",
    "category_id" "uuid",
    "supplier_id" "uuid",
    "is_stocked" boolean DEFAULT true NOT NULL,
    "is_consumable" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_items" IS 'Articoli inventario (master data)';



CREATE TABLE IF NOT EXISTS "public"."inventory_stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "warehouse_id" "uuid",
    "movement_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_id" "uuid",
    "reason" "text",
    "reference_type" "text",
    "reference_id" "uuid",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_stock_movements_type_ck" CHECK (("movement_type" = ANY (ARRAY['opening'::"text", 'in'::"text", 'out'::"text", 'adjust'::"text", 'transfer_in'::"text", 'transfer_out'::"text"])))
);


ALTER TABLE "public"."inventory_stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_stock_movements" IS 'Movimenti di magazzino (source of truth per quantità)';



CREATE OR REPLACE VIEW "public"."inventory_stock" AS
 SELECT "site_id",
    "variant_id",
    "warehouse_id",
    "sum"(
        CASE
            WHEN ("movement_type" = ANY (ARRAY['opening'::"text", 'in'::"text", 'transfer_in'::"text"])) THEN "quantity"
            WHEN ("movement_type" = ANY (ARRAY['out'::"text", 'transfer_out'::"text"])) THEN (- "quantity")
            WHEN ("movement_type" = 'adjust'::"text") THEN "quantity"
            ELSE (0)::numeric
        END) AS "quantity"
   FROM "public"."inventory_stock_movements" "m"
  GROUP BY "site_id", "variant_id", "warehouse_id";


ALTER VIEW "public"."inventory_stock" OWNER TO "postgres";


COMMENT ON VIEW "public"."inventory_stock" IS 'Computed stock by summing inventory_stock_movements. Source of truth is movements.';



CREATE TABLE IF NOT EXISTS "public"."inventory_subcategory_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "subcategory_key" "text" NOT NULL,
    "subcategory_name" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."inventory_subcategory_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "notes" "text",
    "short_name" "text",
    "address" "text",
    "location" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "contact" "text",
    "cap" integer,
    "supplier_image" "text",
    "supplier_category_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_suppliers" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_suppliers" IS 'Fornitori per site';



CREATE TABLE IF NOT EXISTS "public"."inventory_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "unit_type" "text" NOT NULL,
    "base_unit_id" "uuid",
    "multiplier" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_units_multiplier_ck" CHECK ((("multiplier" IS NULL) OR ("multiplier" > (0)::numeric))),
    CONSTRAINT "inventory_units_unit_type_ck" CHECK (("unit_type" = ANY (ARRAY['unit'::"text", 'weight'::"text", 'volume'::"text", 'length'::"text", 'area'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."inventory_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_units" IS 'Unità di misura per l''inventario (globali)';



CREATE TABLE IF NOT EXISTS "public"."inventory_warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_warehouses" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_warehouses" IS 'Magazzini/location per site';



CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "leave_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "leave_requests_leave_type_check" CHECK (("leave_type" = ANY (ARRAY['vacanze'::"text", 'malattia'::"text", 'infortunio'::"text", 'smart_working'::"text", 'formazione'::"text", 'assenza_privata'::"text", 'ipg'::"text"]))),
    CONSTRAINT "leave_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "code" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "beta_app_enabled" boolean DEFAULT false NOT NULL,
    "areas_visible" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pm_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_area_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "area_slug" "text" NOT NULL,
    "score" integer NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_area_scores_area_slug_check" CHECK (("area_slug" = ANY (ARRAY['career'::"text", 'finance'::"text", 'family'::"text", 'health'::"text", 'fun'::"text", 'friends'::"text", 'growth'::"text", 'spiritual'::"text"]))),
    CONSTRAINT "pm_area_scores_score_check" CHECK ((("score" >= 0) AND ("score" <= 10)))
);


ALTER TABLE "public"."pm_area_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "area_slug" "text",
    "name" "text" NOT NULL,
    "stato" "text" DEFAULT 'previsto'::"text" NOT NULL,
    "data_prevista" "date",
    "data_attivazione" "date",
    "source_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_automations_area_slug_check" CHECK (("area_slug" = ANY (ARRAY['career'::"text", 'finance'::"text", 'family'::"text", 'health'::"text", 'fun'::"text", 'friends'::"text", 'growth'::"text", 'spiritual'::"text"]))),
    CONSTRAINT "pm_automations_stato_check" CHECK (("stato" = ANY (ARRAY['previsto'::"text", 'in_integrazione'::"text", 'attivo'::"text"])))
);


ALTER TABLE "public"."pm_automations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_data_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'internal'::"text" NOT NULL,
    "area_slug" "text",
    "sync_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_data_sources_area_slug_check" CHECK (("area_slug" = ANY (ARRAY['career'::"text", 'finance'::"text", 'family'::"text", 'health'::"text", 'fun'::"text", 'friends'::"text", 'growth'::"text", 'spiritual'::"text"]))),
    CONSTRAINT "pm_data_sources_type_check" CHECK (("type" = ANY (ARRAY['internal'::"text", 'external'::"text", 'wearable'::"text", 'accounting'::"text", 'calendar'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."pm_data_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_item_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "priority" integer NOT NULL,
    "snapshot_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pm_item_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "area_slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "notes" "text",
    "priority" integer DEFAULT 3 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "due_date" "date",
    "source_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "pm_items_area_slug_check" CHECK (("area_slug" = ANY (ARRAY['career'::"text", 'finance'::"text", 'family'::"text", 'health'::"text", 'fun'::"text", 'friends'::"text", 'growth'::"text", 'spiritual'::"text"]))),
    CONSTRAINT "pm_items_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5))),
    CONSTRAINT "pm_items_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'done'::"text", 'postponed'::"text"])))
);


ALTER TABLE "public"."pm_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_life_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "accent_color" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_life_areas_slug_check" CHECK (("slug" = ANY (ARRAY['career'::"text", 'finance'::"text", 'family'::"text", 'health'::"text", 'fun'::"text", 'friends'::"text", 'growth'::"text", 'spiritual'::"text"])))
);


ALTER TABLE "public"."pm_life_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."righe_documento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "documento_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "posizione" integer NOT NULL,
    "art" "text",
    "descrizione" "text" NOT NULL,
    "misure" "text",
    "unita" "text",
    "quantita" numeric,
    "prezzo_unitario" numeric,
    "sconto" numeric,
    "totale_riga" numeric,
    "articolo_id" "text",
    "articolo_source" "text",
    "is_trasporto" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "immagine_url" "text",
    "descrizione_estesa" "text",
    CONSTRAINT "righe_documento_articolo_source_check" CHECK (("articolo_source" = ANY (ARRAY['sell_product'::"text", 'inventory'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."righe_documento" OWNER TO "postgres";


COMMENT ON COLUMN "public"."righe_documento"."immagine_url" IS 'URL immagine prodotto importata dal catalogo';



COMMENT ON COLUMN "public"."righe_documento"."descrizione_estesa" IS 'Descrizione completa in testo libero, opzionale, mostrata sotto la descrizione breve';



CREATE TABLE IF NOT EXISTS "public"."sellproduct_categories" (
    "id" integer NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "icon" "text",
    "icon_color" "text" DEFAULT '#3B82F6'::"text",
    "image_url" "text",
    "supplier_names" "text"[] DEFAULT ARRAY[]::"text"[],
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."sellproduct_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."sellproduct_categories" IS 'Categorie per i prodotti vendibili (SellProduct), per site';



COMMENT ON COLUMN "public"."sellproduct_categories"."name" IS 'Nome della categoria (es: Arredamento, Porte, Serramenti)';



COMMENT ON COLUMN "public"."sellproduct_categories"."color" IS 'Colore per visualizzazione UI';



COMMENT ON COLUMN "public"."sellproduct_categories"."icon" IS 'Nome icona usata nella configurazione categorie prodotto';



COMMENT ON COLUMN "public"."sellproduct_categories"."icon_color" IS 'Colore dell''icona categoria prodotto';



COMMENT ON COLUMN "public"."sellproduct_categories"."image_url" IS 'Immagine quadrata opzionale usata al posto dell''icona';



COMMENT ON COLUMN "public"."sellproduct_categories"."supplier_names" IS 'Elenco fornitori suggeriti per la categoria prodotto';



CREATE SEQUENCE IF NOT EXISTS "public"."sellproduct_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sellproduct_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sellproduct_categories_id_seq" OWNED BY "public"."sellproduct_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."sellproduct_subcategory_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "category_id" integer NOT NULL,
    "subcategory_key" "text" NOT NULL,
    "subcategory_name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sellproduct_subcategory_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_ai_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "ai_provider" "text" DEFAULT 'openai'::"text",
    "ai_api_key" "text",
    "ai_model" "text" DEFAULT 'gpt-4o-mini'::"text",
    "speech_provider" "text" DEFAULT 'web-speech'::"text",
    "whisper_api_key" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "documenti_ai_provider" "text",
    "documenti_ai_model" "text",
    "documenti_ai_api_key" "text"
);


ALTER TABLE "public"."site_ai_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_ai_settings" IS 'Per-site AI configuration including API keys and provider settings';



COMMENT ON COLUMN "public"."site_ai_settings"."ai_api_key" IS 'API key for the AI provider';



COMMENT ON COLUMN "public"."site_ai_settings"."whisper_api_key" IS 'API key for Whisper (optional, uses ai_api_key if not set)';



COMMENT ON COLUMN "public"."site_ai_settings"."documenti_ai_provider" IS 'Provider AI per generazione documenti (override opzionale)';



COMMENT ON COLUMN "public"."site_ai_settings"."documenti_ai_model" IS 'Modello AI per generazione documenti';



COMMENT ON COLUMN "public"."site_ai_settings"."documenti_ai_api_key" IS 'API key dedicata generazione documenti (server-only)';



CREATE TABLE IF NOT EXISTS "public"."site_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" integer NOT NULL,
    "site_id" "uuid" NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_settings" IS 'Configurazioni per site, inclusi template codici e impostazioni auto-archiviazione';



CREATE SEQUENCE IF NOT EXISTS "public"."site_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."site_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."site_settings_id_seq" OWNED BY "public"."site_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "subdomain" "text" NOT NULL,
    "custom_domain" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "image" "text",
    "imageblurhash" "text",
    "logo" "text",
    "document_template_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sites"."document_template_config" IS 'Branding documenti per-site: mittente, banca, logo, colori, condizioni default';



CREATE TABLE IF NOT EXISTS "public"."user_kanban_category_permissions" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kanban_category_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_kanban_category_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_kanban_category_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_kanban_category_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_kanban_category_permissions_id_seq" OWNED BY "public"."user_kanban_category_permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."user_kanban_permissions" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kanban_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_kanban_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_kanban_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_kanban_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_kanban_permissions_id_seq" OWNED BY "public"."user_kanban_permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."user_module_permissions" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_module_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_module_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_module_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_module_permissions_id_seq" OWNED BY "public"."user_module_permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_organizations" IS 'Junction table for many-to-many relationship between users and organizations';



COMMENT ON COLUMN "public"."user_organizations"."id" IS 'Unique identifier for the user-organization relationship';



COMMENT ON COLUMN "public"."user_organizations"."user_id" IS 'Reference to auth.users.id';



COMMENT ON COLUMN "public"."user_organizations"."organization_id" IS 'Reference to organizations.id';



COMMENT ON COLUMN "public"."user_organizations"."created_at" IS 'When this relationship was created';



COMMENT ON COLUMN "public"."user_organizations"."updated_at" IS 'When this relationship was last updated';



CREATE TABLE IF NOT EXISTS "public"."user_site_select_preferences" (
    "user_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "group_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_site_select_preferences_group_key_check" CHECK (("group_key" = ANY (ARRAY['active'::"text", 'custom'::"text", 'beta'::"text", 'alpha'::"text"])))
);


ALTER TABLE "public"."user_site_select_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_sites" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sites" IS 'Junction table allowing users to be associated with multiple sites with specific roles';



COMMENT ON COLUMN "public"."user_sites"."user_id" IS 'Reference to auth.users.id';



COMMENT ON COLUMN "public"."user_sites"."site_id" IS 'Reference to sites.id';



ALTER TABLE ONLY "public"."Action" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Action_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Checklist_item" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Checklist_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Client" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Client_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ClientAddress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ClientAddress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Department" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Department_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Errortracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Errortracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Exit_checklist" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Exit_checklist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."File" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."File_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Kanban" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Kanban_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."KanbanCategory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."KanbanCategory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."KanbanColumn" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."KanbanColumn_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Manufacturer" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Manufacturer_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Manufacturer_category" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Manufacturer_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingControl" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingControl_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingMasterItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingMasterItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Product_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product" ALTER COLUMN "inventoryId" SET DEFAULT "nextval"('"public"."Product_inventoryId_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product_category" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Product_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."QcMasterItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."QcMasterItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Qc_item" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Qc_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."QualityControl" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."QualityControl_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Reseller" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Reseller_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."SellProduct" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."SellProduct_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Supplier" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Supplier_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Supplier_category" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Supplier_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Task" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Task_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."TaskHistory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."TaskHistory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."TaskSupplier" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."TaskSupplier_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Timetracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Timetracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."User" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."User_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."code_sequences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."code_sequences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sellproduct_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sellproduct_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."site_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."site_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_kanban_category_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_kanban_category_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_kanban_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_kanban_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_module_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_module_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Checklist_item"
    ADD CONSTRAINT "Checklist_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ClientAddress"
    ADD CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "Exit_checklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."KanbanCategory"
    ADD CONSTRAINT "KanbanCategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."KanbanCategory"
    ADD CONSTRAINT "KanbanCategory_site_id_identifier_key" UNIQUE ("site_id", "identifier");



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Manufacturer_category"
    ADD CONSTRAINT "Manufacturer_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Manufacturer"
    ADD CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PackingItem"
    ADD CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PackingMasterItem"
    ADD CONSTRAINT "PackingMasterItem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Product_category"
    ADD CONSTRAINT "Product_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_inventoryId_key" UNIQUE ("inventoryId");



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."QcMasterItem"
    ADD CONSTRAINT "QcMasterItem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Qc_item"
    ADD CONSTRAINT "Qc_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Reseller"
    ADD CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Roles"
    ADD CONSTRAINT "Roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."Roles"
    ADD CONSTRAINT "Roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SellProduct"
    ADD CONSTRAINT "SellProduct_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Supplier_category"
    ADD CONSTRAINT "Supplier_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskHistory"
    ADD CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskSupplier"
    ADD CONSTRAINT "TaskSupplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TaskSupplier"
    ADD CONSTRAINT "TaskSupplier_taskId_supplierId_key" UNIQUE ("taskId", "supplierId");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_site_unique_code_key" UNIQUE ("site_id", "unique_code");



ALTER TABLE ONLY "public"."Timetracking"
    ADD CONSTRAINT "Timetracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_authId_key" UNIQUE ("authId");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_RolesToTimetracking"
    ADD CONSTRAINT "_RolesToTimetracking_A_B_key" UNIQUE ("A", "B");



ALTER TABLE ONLY "public"."_RolesToUser"
    ADD CONSTRAINT "_RolesToUser_A_B_key" UNIQUE ("A", "B");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_site_id_user_id_date_key" UNIQUE ("site_id", "user_id", "date");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."code_sequences"
    ADD CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_3d_scenes"
    ADD CONSTRAINT "dashboard_3d_scenes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_access_events"
    ADD CONSTRAINT "demo_access_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_access_tokens"
    ADD CONSTRAINT "demo_access_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_access_tokens"
    ADD CONSTRAINT "demo_access_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_demo_user_id_key" UNIQUE ("demo_user_id");



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_site_id_key" UNIQUE ("site_id");



ALTER TABLE ONLY "public"."documenti"
    ADD CONSTRAINT "documenti_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_clienti"
    ADD CONSTRAINT "ev_clienti_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_eventi_fornitori"
    ADD CONSTRAINT "ev_eventi_fornitori_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_eventi"
    ADD CONSTRAINT "ev_eventi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_eventi_task"
    ADD CONSTRAINT "ev_eventi_task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_fatture"
    ADD CONSTRAINT "ev_fatture_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_fornitori"
    ADD CONSTRAINT "ev_fornitori_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_location"
    ADD CONSTRAINT "ev_location_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ev_offerte"
    ADD CONSTRAINT "ev_offerte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."internal_activities"
    ADD CONSTRAINT "internal_activities_code_site_unique" UNIQUE ("code", "site_id");



ALTER TABLE ONLY "public"."internal_activities"
    ADD CONSTRAINT "internal_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_site_name_uk" UNIQUE ("site_id", "name");



ALTER TABLE ONLY "public"."inventory_item_variants"
    ADD CONSTRAINT "inventory_item_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_site_name_uk" UNIQUE ("site_id", "name");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_subcategory_images"
    ADD CONSTRAINT "inventory_subcategory_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_subcategory_images"
    ADD CONSTRAINT "inventory_subcategory_images_unique" UNIQUE ("site_id", "category_id", "subcategory_key");



ALTER TABLE ONLY "public"."inventory_suppliers"
    ADD CONSTRAINT "inventory_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_suppliers"
    ADD CONSTRAINT "inventory_suppliers_site_name_uk" UNIQUE ("site_id", "name");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_code_uk" UNIQUE ("code");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_warehouses"
    ADD CONSTRAINT "inventory_warehouses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_warehouses"
    ADD CONSTRAINT "inventory_warehouses_site_name_uk" UNIQUE ("site_id", "name");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_access"
    ADD CONSTRAINT "pm_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_access"
    ADD CONSTRAINT "pm_access_site_id_user_id_key" UNIQUE ("site_id", "user_id");



ALTER TABLE ONLY "public"."pm_area_scores"
    ADD CONSTRAINT "pm_area_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_automations"
    ADD CONSTRAINT "pm_automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_data_sources"
    ADD CONSTRAINT "pm_data_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_item_snapshots"
    ADD CONSTRAINT "pm_item_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_items"
    ADD CONSTRAINT "pm_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_life_areas"
    ADD CONSTRAINT "pm_life_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_life_areas"
    ADD CONSTRAINT "pm_life_areas_site_id_slug_key" UNIQUE ("site_id", "slug");



ALTER TABLE ONLY "public"."righe_documento"
    ADD CONSTRAINT "righe_documento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sellproduct_categories"
    ADD CONSTRAINT "sellproduct_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sellproduct_categories"
    ADD CONSTRAINT "sellproduct_categories_site_name_unique" UNIQUE ("site_id", "name");



ALTER TABLE ONLY "public"."sellproduct_subcategory_images"
    ADD CONSTRAINT "sellproduct_subcategory_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sellproduct_subcategory_images"
    ADD CONSTRAINT "sellproduct_subcategory_images_unique" UNIQUE ("site_id", "category_id", "subcategory_key");



ALTER TABLE ONLY "public"."site_ai_settings"
    ADD CONSTRAINT "site_ai_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_ai_settings"
    ADD CONSTRAINT "site_ai_settings_site_id_key" UNIQUE ("site_id");



ALTER TABLE ONLY "public"."site_modules"
    ADD CONSTRAINT "site_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_modules"
    ADD CONSTRAINT "site_modules_site_id_module_name_key" UNIQUE ("site_id", "module_name");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_site_key_unique" UNIQUE ("site_id", "setting_key");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_custom_domain_key" UNIQUE ("custom_domain");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "user_auth_id_unique" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."user_kanban_category_permissions"
    ADD CONSTRAINT "user_kanban_category_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_kanban_category_permissions"
    ADD CONSTRAINT "user_kanban_category_permissions_user_id_kanban_category_id_key" UNIQUE ("user_id", "kanban_category_id");



ALTER TABLE ONLY "public"."user_kanban_permissions"
    ADD CONSTRAINT "user_kanban_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_kanban_permissions"
    ADD CONSTRAINT "user_kanban_permissions_user_id_kanban_id_key" UNIQUE ("user_id", "kanban_id");



ALTER TABLE ONLY "public"."user_module_permissions"
    ADD CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_module_permissions"
    ADD CONSTRAINT "user_module_permissions_user_id_site_id_module_name_key" UNIQUE ("user_id", "site_id", "module_name");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_org_unique" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."user_site_select_preferences"
    ADD CONSTRAINT "user_site_select_preferences_pkey" PRIMARY KEY ("user_id", "site_id");



ALTER TABLE ONLY "public"."user_sites"
    ADD CONSTRAINT "user_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sites"
    ADD CONSTRAINT "user_sites_user_id_site_id_key" UNIQUE ("user_id", "site_id");



CREATE INDEX "File_sellProductId_idx" ON "public"."File" USING "btree" ("sellProductId");



CREATE INDEX "Product_category_code_idx" ON "public"."Product" USING "btree" ("category_code");



CREATE INDEX "Product_category_idx" ON "public"."Product" USING "btree" ("category");



CREATE UNIQUE INDEX "Product_internal_code_unique_idx" ON "public"."Product" USING "btree" ("internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "Product_subcategory_idx" ON "public"."Product" USING "btree" ("subcategory");



CREATE INDEX "Product_warehouse_number_idx" ON "public"."Product" USING "btree" ("warehouse_number");



CREATE UNIQUE INDEX "SellProduct_internal_code_site_unique_idx" ON "public"."SellProduct" USING "btree" ("internal_code", "site_id") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "SellProduct_name_idx" ON "public"."SellProduct" USING "btree" ("name");



CREATE INDEX "SellProduct_product_type_idx" ON "public"."SellProduct" USING "btree" ("product_type");



CREATE INDEX "SellProduct_subcategory_idx" ON "public"."SellProduct" USING "btree" ("subcategory");



CREATE INDEX "SellProduct_supplier_id_idx" ON "public"."SellProduct" USING "btree" ("supplier_id");



CREATE INDEX "SellProduct_tipo_idx" ON "public"."SellProduct" USING "btree" ("tipo");



CREATE INDEX "Task_sellProductId_idx" ON "public"."Task" USING "btree" ("sellProductId");



CREATE UNIQUE INDEX "code_sequences_no_category_unique" ON "public"."code_sequences" USING "btree" ("site_id", "sequence_type", "year") WHERE ("category_id" IS NULL);



CREATE UNIQUE INDEX "code_sequences_unique" ON "public"."code_sequences" USING "btree" ("site_id", "sequence_type", "year", COALESCE("category_id", '-1'::integer));



CREATE UNIQUE INDEX "dashboard_3d_scenes_one_per_site" ON "public"."dashboard_3d_scenes" USING "btree" ("site_id");



CREATE INDEX "documenti_numero_idx" ON "public"."documenti" USING "btree" ("site_id", "numero");



CREATE INDEX "documenti_site_id_idx" ON "public"."documenti" USING "btree" ("site_id");



CREATE INDEX "documenti_task_id_idx" ON "public"."documenti" USING "btree" ("task_id");



CREATE INDEX "documenti_tipo_documento_idx" ON "public"."documenti" USING "btree" ("tipo_documento");



CREATE INDEX "ev_clienti_site_id_idx" ON "public"."ev_clienti" USING "btree" ("site_id");



CREATE INDEX "ev_eventi_cliente_id_idx" ON "public"."ev_eventi" USING "btree" ("cliente_id");



CREATE INDEX "ev_eventi_fornitori_evento_id_idx" ON "public"."ev_eventi_fornitori" USING "btree" ("evento_id");



CREATE INDEX "ev_eventi_fornitori_fornitore_id_idx" ON "public"."ev_eventi_fornitori" USING "btree" ("fornitore_id");



CREATE INDEX "ev_eventi_fornitori_site_id_idx" ON "public"."ev_eventi_fornitori" USING "btree" ("site_id");



CREATE INDEX "ev_eventi_location_id_idx" ON "public"."ev_eventi" USING "btree" ("location_id");



CREATE INDEX "ev_eventi_offerta_id_idx" ON "public"."ev_eventi" USING "btree" ("offerta_id");



CREATE INDEX "ev_eventi_site_id_idx" ON "public"."ev_eventi" USING "btree" ("site_id");



CREATE INDEX "ev_eventi_stato_accounting_idx" ON "public"."ev_eventi" USING "btree" ("stato_accounting");



CREATE INDEX "ev_eventi_stato_plan_idx" ON "public"."ev_eventi" USING "btree" ("stato_plan");



CREATE INDEX "ev_eventi_task_evento_id_idx" ON "public"."ev_eventi_task" USING "btree" ("evento_id");



CREATE INDEX "ev_eventi_task_site_id_idx" ON "public"."ev_eventi_task" USING "btree" ("site_id");



CREATE INDEX "ev_eventi_tipo_evento_idx" ON "public"."ev_eventi" USING "btree" ("tipo_evento");



CREATE INDEX "ev_fatture_evento_id_idx" ON "public"."ev_fatture" USING "btree" ("evento_id");



CREATE INDEX "ev_fatture_site_id_idx" ON "public"."ev_fatture" USING "btree" ("site_id");



CREATE INDEX "ev_fornitori_categoria_idx" ON "public"."ev_fornitori" USING "btree" ("categoria");



CREATE INDEX "ev_fornitori_site_id_idx" ON "public"."ev_fornitori" USING "btree" ("site_id");



CREATE INDEX "ev_location_site_id_idx" ON "public"."ev_location" USING "btree" ("site_id");



CREATE INDEX "ev_offerte_cliente_id_idx" ON "public"."ev_offerte" USING "btree" ("cliente_id");



CREATE INDEX "ev_offerte_evento_id_idx" ON "public"."ev_offerte" USING "btree" ("evento_id");



CREATE INDEX "ev_offerte_site_id_idx" ON "public"."ev_offerte" USING "btree" ("site_id");



CREATE INDEX "ev_offerte_stato_idx" ON "public"."ev_offerte" USING "btree" ("stato");



CREATE INDEX "idx_attendance_entries_site_date" ON "public"."attendance_entries" USING "btree" ("site_id", "date");



CREATE INDEX "idx_attendance_entries_site_user" ON "public"."attendance_entries" USING "btree" ("site_id", "user_id");



CREATE INDEX "idx_attendance_entries_user_date" ON "public"."attendance_entries" USING "btree" ("user_id", "date");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_client_organization_id" ON "public"."Client" USING "btree" ("organization_id");



CREATE INDEX "idx_client_site_id" ON "public"."Client" USING "btree" ("site_id");



CREATE INDEX "idx_code_sequences_site_type_year" ON "public"."code_sequences" USING "btree" ("site_id", "sequence_type", "year");



CREATE INDEX "idx_dashboard_3d_scenes_site_status" ON "public"."dashboard_3d_scenes" USING "btree" ("site_id", "status");



CREATE INDEX "idx_demo_access_events_token_id" ON "public"."demo_access_events" USING "btree" ("access_token_id");



CREATE INDEX "idx_demo_access_events_type_created_at" ON "public"."demo_access_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_demo_access_events_workspace_id" ON "public"."demo_access_events" USING "btree" ("workspace_id");



CREATE INDEX "idx_demo_access_tokens_expires_at" ON "public"."demo_access_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_demo_access_tokens_revoked_at" ON "public"."demo_access_tokens" USING "btree" ("revoked_at");



CREATE INDEX "idx_demo_access_tokens_workspace_id" ON "public"."demo_access_tokens" USING "btree" ("workspace_id");



CREATE INDEX "idx_demo_workspaces_customer_company" ON "public"."demo_workspaces" USING "btree" ("customer_company");



CREATE INDEX "idx_demo_workspaces_expires_at" ON "public"."demo_workspaces" USING "btree" ("expires_at");



CREATE INDEX "idx_demo_workspaces_last_login_at" ON "public"."demo_workspaces" USING "btree" ("last_login_at");



CREATE INDEX "idx_demo_workspaces_status" ON "public"."demo_workspaces" USING "btree" ("status");



CREATE INDEX "idx_errortracking_task_id" ON "public"."Errortracking" USING "btree" ("task_id");



CREATE INDEX "idx_exit_checklist_employee_id" ON "public"."Exit_checklist" USING "btree" ("employee_id");



CREATE INDEX "idx_exit_checklist_task_id" ON "public"."Exit_checklist" USING "btree" ("task_id");



CREATE INDEX "idx_kanban_category_id" ON "public"."Kanban" USING "btree" ("category_id");



CREATE INDEX "idx_kanban_category_identifier" ON "public"."KanbanCategory" USING "btree" ("identifier");



CREATE INDEX "idx_kanban_category_site_id" ON "public"."KanbanCategory" USING "btree" ("site_id");



CREATE INDEX "idx_leave_requests_site_status" ON "public"."leave_requests" USING "btree" ("site_id", "status");



CREATE INDEX "idx_leave_requests_user" ON "public"."leave_requests" USING "btree" ("user_id");



CREATE INDEX "idx_manufacturer_category_id" ON "public"."Manufacturer" USING "btree" ("manufacturer_category_id");



CREATE UNIQUE INDEX "idx_manufacturer_category_name_site" ON "public"."Manufacturer_category" USING "btree" ("name", "site_id");



CREATE INDEX "idx_manufacturer_category_site_id" ON "public"."Manufacturer_category" USING "btree" ("site_id");



CREATE INDEX "idx_manufacturer_site_id" ON "public"."Manufacturer" USING "btree" ("site_id");



CREATE INDEX "idx_packingcontrol_taskid" ON "public"."PackingControl" USING "btree" ("taskId");



CREATE INDEX "idx_packingitem_packingcontrolid" ON "public"."PackingItem" USING "btree" ("packingControlId");



CREATE INDEX "idx_product_category_code" ON "public"."Product_category" USING "btree" ("code");



CREATE INDEX "idx_qc_item_qualitycontrolid" ON "public"."Qc_item" USING "btree" ("qualityControlId");



CREATE INDEX "idx_qualitycontrol_taskid" ON "public"."QualityControl" USING "btree" ("taskId");



CREATE INDEX "idx_reseller_country_code" ON "public"."Reseller" USING "btree" ("country_code");



CREATE INDEX "idx_reseller_site_id" ON "public"."Reseller" USING "btree" ("site_id");



CREATE INDEX "idx_sellproduct_categories_name" ON "public"."sellproduct_categories" USING "btree" ("name");



CREATE INDEX "idx_sellproduct_categories_site_id" ON "public"."sellproduct_categories" USING "btree" ("site_id");



CREATE INDEX "idx_sellproduct_category_id" ON "public"."SellProduct" USING "btree" ("category_id");



CREATE INDEX "idx_site_ai_settings_site_id" ON "public"."site_ai_settings" USING "btree" ("site_id");



CREATE INDEX "idx_site_modules_module_name" ON "public"."site_modules" USING "btree" ("module_name");



CREATE INDEX "idx_site_modules_site_id" ON "public"."site_modules" USING "btree" ("site_id");



CREATE INDEX "idx_site_settings_key" ON "public"."site_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_site_settings_site_id" ON "public"."site_settings" USING "btree" ("site_id");



CREATE INDEX "idx_supplier_category_id" ON "public"."Supplier" USING "btree" ("supplier_category_id");



CREATE UNIQUE INDEX "idx_supplier_category_name_site" ON "public"."Supplier_category" USING "btree" ("name", "site_id");



CREATE INDEX "idx_supplier_category_site_id" ON "public"."Supplier_category" USING "btree" ("site_id");



CREATE INDEX "idx_task_auto_archive_at" ON "public"."Task" USING "btree" ("auto_archive_at");



CREATE INDEX "idx_task_display_mode" ON "public"."Task" USING "btree" ("display_mode");



CREATE INDEX "idx_task_draft_category_ids" ON "public"."Task" USING "gin" ("draft_category_ids");



CREATE INDEX "idx_task_is_draft" ON "public"."Task" USING "btree" ("is_draft");



CREATE INDEX "idx_task_parent_task_id" ON "public"."Task" USING "btree" ("parent_task_id");



CREATE INDEX "idx_task_sent_date" ON "public"."Task" USING "btree" ("sent_date");



CREATE INDEX "idx_task_source_offer_code" ON "public"."Task" USING "btree" ("source_offer_code");



CREATE INDEX "idx_task_task_type" ON "public"."Task" USING "btree" ("task_type");



CREATE INDEX "idx_taskhistory_taskid" ON "public"."TaskHistory" USING "btree" ("taskId");



CREATE INDEX "idx_timetracking_site_id" ON "public"."Timetracking" USING "btree" ("site_id");



CREATE INDEX "idx_timetracking_task_id" ON "public"."Timetracking" USING "btree" ("task_id");



CREATE INDEX "idx_user_assistance_level" ON "public"."User" USING "btree" ("assistance_level");



CREATE INDEX "idx_user_company_role" ON "public"."User" USING "btree" ("company_role");



CREATE INDEX "idx_user_kanban_category_permissions_user" ON "public"."user_kanban_category_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_kanban_permissions_user" ON "public"."user_kanban_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_module_permissions_user_site" ON "public"."user_module_permissions" USING "btree" ("user_id", "site_id");



CREATE INDEX "idx_user_organizations_organization_id" ON "public"."user_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_user_organizations_user_id" ON "public"."user_organizations" USING "btree" ("user_id");



CREATE INDEX "idx_user_organizations_user_org" ON "public"."user_organizations" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_user_site_select_preferences_site_id" ON "public"."user_site_select_preferences" USING "btree" ("site_id");



CREATE INDEX "idx_user_sites_site_id" ON "public"."user_sites" USING "btree" ("site_id");



COMMENT ON INDEX "public"."idx_user_sites_site_id" IS 'Optimizes queries filtering user_sites by site_id';



CREATE INDEX "idx_user_sites_user_id" ON "public"."user_sites" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_user_sites_user_id" IS 'Optimizes queries filtering user_sites by user_id';



CREATE INDEX "idx_user_sites_user_site" ON "public"."user_sites" USING "btree" ("user_id", "site_id");



COMMENT ON INDEX "public"."idx_user_sites_user_site" IS 'Optimizes queries filtering user_sites by both user_id and site_id';



CREATE INDEX "internal_activities_active_idx" ON "public"."internal_activities" USING "btree" ("is_active");



CREATE INDEX "internal_activities_site_idx" ON "public"."internal_activities" USING "btree" ("site_id");



CREATE INDEX "internal_activities_sort_idx" ON "public"."internal_activities" USING "btree" ("sort_order");



CREATE INDEX "inventory_categories_parent_idx" ON "public"."inventory_categories" USING "btree" ("parent_id");



CREATE INDEX "inventory_categories_site_idx" ON "public"."inventory_categories" USING "btree" ("site_id");



CREATE INDEX "inventory_categories_site_sort_idx" ON "public"."inventory_categories" USING "btree" ("site_id", "sort_order");



CREATE INDEX "inventory_items_category_idx" ON "public"."inventory_items" USING "btree" ("category_id");



CREATE INDEX "inventory_items_site_idx" ON "public"."inventory_items" USING "btree" ("site_id");



CREATE INDEX "inventory_movements_occurred_idx" ON "public"."inventory_stock_movements" USING "btree" ("occurred_at");



CREATE INDEX "inventory_movements_site_idx" ON "public"."inventory_stock_movements" USING "btree" ("site_id");



CREATE INDEX "inventory_movements_variant_idx" ON "public"."inventory_stock_movements" USING "btree" ("variant_id");



CREATE INDEX "inventory_movements_wh_idx" ON "public"."inventory_stock_movements" USING "btree" ("warehouse_id");



CREATE INDEX "inventory_subcategory_images_site_category_idx" ON "public"."inventory_subcategory_images" USING "btree" ("site_id", "category_id");



CREATE INDEX "inventory_subcategory_images_sort_idx" ON "public"."inventory_subcategory_images" USING "btree" ("site_id", "category_id", "sort_order");



CREATE INDEX "inventory_suppliers_site_idx" ON "public"."inventory_suppliers" USING "btree" ("site_id");



CREATE INDEX "inventory_variants_item_idx" ON "public"."inventory_item_variants" USING "btree" ("item_id");



CREATE INDEX "inventory_variants_site_idx" ON "public"."inventory_item_variants" USING "btree" ("site_id");



CREATE UNIQUE INDEX "inventory_variants_site_internal_code_uk" ON "public"."inventory_item_variants" USING "btree" ("site_id", "internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "inventory_warehouses_site_idx" ON "public"."inventory_warehouses" USING "btree" ("site_id");



CREATE UNIQUE INDEX "kanban_category_internal_base_unique" ON "public"."KanbanCategory" USING "btree" ("site_id", "internal_base_code") WHERE ("internal_base_code" IS NOT NULL);



CREATE INDEX "pm_access_site_user_idx" ON "public"."pm_access" USING "btree" ("site_id", "user_id");



CREATE INDEX "pm_area_scores_recorded_at_idx" ON "public"."pm_area_scores" USING "btree" ("recorded_at");



CREATE INDEX "pm_area_scores_site_user_area_idx" ON "public"."pm_area_scores" USING "btree" ("site_id", "user_id", "area_slug");



CREATE INDEX "pm_area_scores_site_user_idx" ON "public"."pm_area_scores" USING "btree" ("site_id", "user_id");



CREATE INDEX "pm_automations_site_id_idx" ON "public"."pm_automations" USING "btree" ("site_id");



CREATE INDEX "pm_automations_stato_idx" ON "public"."pm_automations" USING "btree" ("stato");



CREATE INDEX "pm_data_sources_site_id_idx" ON "public"."pm_data_sources" USING "btree" ("site_id");



CREATE INDEX "pm_item_snapshots_item_id_idx" ON "public"."pm_item_snapshots" USING "btree" ("item_id");



CREATE INDEX "pm_item_snapshots_site_user_idx" ON "public"."pm_item_snapshots" USING "btree" ("site_id", "user_id");



CREATE INDEX "pm_items_due_date_idx" ON "public"."pm_items" USING "btree" ("due_date");



CREATE INDEX "pm_items_site_user_area_idx" ON "public"."pm_items" USING "btree" ("site_id", "user_id", "area_slug");



CREATE INDEX "pm_items_site_user_idx" ON "public"."pm_items" USING "btree" ("site_id", "user_id");



CREATE INDEX "pm_items_status_idx" ON "public"."pm_items" USING "btree" ("status");



CREATE INDEX "pm_life_areas_site_id_idx" ON "public"."pm_life_areas" USING "btree" ("site_id");



CREATE INDEX "righe_documento_documento_id_idx" ON "public"."righe_documento" USING "btree" ("documento_id");



CREATE INDEX "righe_documento_site_id_idx" ON "public"."righe_documento" USING "btree" ("site_id");



CREATE INDEX "sellproduct_categories_site_sort_idx" ON "public"."sellproduct_categories" USING "btree" ("site_id", "sort_order");



CREATE INDEX "sellproduct_description_trgm_idx" ON "public"."SellProduct" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "sellproduct_internal_code_idx" ON "public"."SellProduct" USING "btree" ("site_id", "internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "sellproduct_name_trgm_idx" ON "public"."SellProduct" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "sellproduct_subcategory_images_site_category_idx" ON "public"."sellproduct_subcategory_images" USING "btree" ("site_id", "category_id");



CREATE INDEX "sellproduct_subcategory_images_sort_idx" ON "public"."sellproduct_subcategory_images" USING "btree" ("site_id", "category_id", "sort_order");



CREATE OR REPLACE TRIGGER "dashboard_3d_scenes_updated_at_trigger" BEFORE UPDATE ON "public"."dashboard_3d_scenes" FOR EACH ROW EXECUTE FUNCTION "public"."update_dashboard_3d_scenes_updated_at"();



CREATE OR REPLACE TRIGGER "documenti_set_updated_at" BEFORE UPDATE ON "public"."documenti" FOR EACH ROW EXECUTE FUNCTION "public"."set_documenti_updated_at"();



CREATE OR REPLACE TRIGGER "ev_clienti_set_updated_at" BEFORE UPDATE ON "public"."ev_clienti" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_eventi_fornitori_set_updated_at" BEFORE UPDATE ON "public"."ev_eventi_fornitori" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_eventi_set_updated_at" BEFORE UPDATE ON "public"."ev_eventi" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_eventi_task_set_updated_at" BEFORE UPDATE ON "public"."ev_eventi_task" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_fatture_set_updated_at" BEFORE UPDATE ON "public"."ev_fatture" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_fornitori_set_updated_at" BEFORE UPDATE ON "public"."ev_fornitori" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_location_set_updated_at" BEFORE UPDATE ON "public"."ev_location" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_offerte_set_updated_at" BEFORE UPDATE ON "public"."ev_offerte" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ev_offerte_vinta_trigger" BEFORE UPDATE OF "stato" ON "public"."ev_offerte" FOR EACH ROW EXECUTE FUNCTION "public"."ev_handle_offerta_vinta"();



CREATE OR REPLACE TRIGGER "pm_access_set_updated_at" BEFORE UPDATE ON "public"."pm_access" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pm_automations_set_updated_at" BEFORE UPDATE ON "public"."pm_automations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pm_data_sources_set_updated_at" BEFORE UPDATE ON "public"."pm_data_sources" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pm_items_set_updated_at" BEFORE UPDATE ON "public"."pm_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pm_items_snapshot_insert" AFTER INSERT ON "public"."pm_items" FOR EACH ROW EXECUTE FUNCTION "public"."pm_record_item_snapshot"();



CREATE OR REPLACE TRIGGER "pm_items_snapshot_update" AFTER UPDATE OF "status", "priority" ON "public"."pm_items" FOR EACH ROW EXECUTE FUNCTION "public"."pm_record_item_snapshot"();



CREATE OR REPLACE TRIGGER "pm_life_areas_set_updated_at" BEFORE UPDATE ON "public"."pm_life_areas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pm_seed_life_areas_after_site_insert" AFTER INSERT ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."pm_seed_life_areas_on_site"();



CREATE OR REPLACE TRIGGER "site_ai_settings_updated_at_trigger" BEFORE UPDATE ON "public"."site_ai_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_site_ai_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_demo_workspaces_updated_at" BEFORE UPDATE ON "public"."demo_workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_demo_updated_at"();



CREATE OR REPLACE TRIGGER "trg_internal_activities_updated_at" BEFORE UPDATE ON "public"."internal_activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_inventory_categories_updated_at" BEFORE UPDATE ON "public"."inventory_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_suppliers_updated_at" BEFORE UPDATE ON "public"."inventory_suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_variants_updated_at" BEFORE UPDATE ON "public"."inventory_item_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_warehouses_updated_at" BEFORE UPDATE ON "public"."inventory_warehouses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_site_select_preferences_updated_at" BEFORE UPDATE ON "public"."user_site_select_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_add_default_modules_for_site" AFTER INSERT ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."add_default_modules_for_site"();



CREATE OR REPLACE TRIGGER "trigger_update_kanban_category_updated_at" BEFORE UPDATE ON "public"."KanbanCategory" FOR EACH ROW EXECUTE FUNCTION "public"."update_kanban_category_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_organizations_updated_at" BEFORE UPDATE ON "public"."user_organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_organizations_updated_at"();



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("authId");



ALTER TABLE ONLY "public"."ClientAddress"
    ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id");



ALTER TABLE ONLY "public"."Client"
    ADD CONSTRAINT "Client_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."Client"
    ADD CONSTRAINT "Client_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."Department"
    ADD CONSTRAINT "Department_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."Supplier"("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "Exit_checklist_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_errortrackingId_fkey" FOREIGN KEY ("errortrackingId") REFERENCES "public"."Errortracking"("id");



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_sellProductId_fkey" FOREIGN KEY ("sellProductId") REFERENCES "public"."SellProduct"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."KanbanCategory"
    ADD CONSTRAINT "KanbanCategory_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_kanbanId_fkey" FOREIGN KEY ("kanbanId") REFERENCES "public"."Kanban"("id");



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."KanbanCategory"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_target_invoice_kanban_id_fkey" FOREIGN KEY ("target_invoice_kanban_id") REFERENCES "public"."Kanban"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_target_work_kanban_id_fkey" FOREIGN KEY ("target_work_kanban_id") REFERENCES "public"."Kanban"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Manufacturer_category"
    ADD CONSTRAINT "Manufacturer_category_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Manufacturer"
    ADD CONSTRAINT "Manufacturer_manufacturer_category_id_fkey" FOREIGN KEY ("manufacturer_category_id") REFERENCES "public"."Manufacturer_category"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Manufacturer"
    ADD CONSTRAINT "Manufacturer_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."PackingItem"
    ADD CONSTRAINT "PackingItem_packingControlId_fkey" FOREIGN KEY ("packingControlId") REFERENCES "public"."PackingControl"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PackingMasterItem"
    ADD CONSTRAINT "PackingMasterItem_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Product_category"("id");



ALTER TABLE ONLY "public"."Product_category"
    ADD CONSTRAINT "Product_category_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id");



ALTER TABLE ONLY "public"."QcMasterItem"
    ADD CONSTRAINT "QcMasterItem_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Qc_item"
    ADD CONSTRAINT "Qc_item_qualityControlId_fkey" FOREIGN KEY ("qualityControlId") REFERENCES "public"."QualityControl"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Reseller"
    ADD CONSTRAINT "Reseller_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Roles"
    ADD CONSTRAINT "Roles_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SellProduct"
    ADD CONSTRAINT "SellProduct_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."sellproduct_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."SellProduct"
    ADD CONSTRAINT "SellProduct_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SellProduct"
    ADD CONSTRAINT "SellProduct_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Supplier_category"
    ADD CONSTRAINT "Supplier_category_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Supplier"
    ADD CONSTRAINT "Supplier_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Supplier"
    ADD CONSTRAINT "Supplier_supplier_category_id_fkey" FOREIGN KEY ("supplier_category_id") REFERENCES "public"."Supplier_category"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."TaskHistory"
    ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."TaskSupplier"
    ADD CONSTRAINT "TaskSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id");



ALTER TABLE ONLY "public"."TaskSupplier"
    ADD CONSTRAINT "TaskSupplier_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_kanbanColumnId_fkey" FOREIGN KEY ("kanbanColumnId") REFERENCES "public"."KanbanColumn"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_kanbanId_fkey" FOREIGN KEY ("kanbanId") REFERENCES "public"."Kanban"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."Task"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_sellProductId_fkey" FOREIGN KEY ("sellProductId") REFERENCES "public"."SellProduct"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Timetracking"
    ADD CONSTRAINT "Timetracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Timetracking"
    ADD CONSTRAINT "Timetracking_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Timetracking"
    ADD CONSTRAINT "Timetracking_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."_RolesToTimetracking"
    ADD CONSTRAINT "_RolesToTimetracking_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_RolesToTimetracking"
    ADD CONSTRAINT "_RolesToTimetracking_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Timetracking"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_RolesToUser"
    ADD CONSTRAINT "_RolesToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."_RolesToUser"
    ADD CONSTRAINT "_RolesToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_sequences"
    ADD CONSTRAINT "code_sequences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."KanbanCategory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_sequences"
    ADD CONSTRAINT "code_sequences_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_3d_scenes"
    ADD CONSTRAINT "dashboard_3d_scenes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dashboard_3d_scenes"
    ADD CONSTRAINT "dashboard_3d_scenes_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_access_events"
    ADD CONSTRAINT "demo_access_events_access_token_id_fkey" FOREIGN KEY ("access_token_id") REFERENCES "public"."demo_access_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."demo_access_events"
    ADD CONSTRAINT "demo_access_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."demo_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_access_tokens"
    ADD CONSTRAINT "demo_access_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."demo_access_tokens"
    ADD CONSTRAINT "demo_access_tokens_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."demo_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_demo_user_id_fkey" FOREIGN KEY ("demo_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documenti"
    ADD CONSTRAINT "documenti_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."Client"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documenti"
    ADD CONSTRAINT "documenti_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documenti"
    ADD CONSTRAINT "documenti_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_clienti"
    ADD CONSTRAINT "ev_clienti_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi"
    ADD CONSTRAINT "ev_eventi_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."ev_clienti"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_eventi_fornitori"
    ADD CONSTRAINT "ev_eventi_fornitori_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."ev_eventi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi_fornitori"
    ADD CONSTRAINT "ev_eventi_fornitori_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "public"."ev_fornitori"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi_fornitori"
    ADD CONSTRAINT "ev_eventi_fornitori_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi"
    ADD CONSTRAINT "ev_eventi_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."ev_location"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_eventi"
    ADD CONSTRAINT "ev_eventi_offerta_id_fkey" FOREIGN KEY ("offerta_id") REFERENCES "public"."ev_offerte"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_eventi"
    ADD CONSTRAINT "ev_eventi_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi_task"
    ADD CONSTRAINT "ev_eventi_task_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."ev_eventi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_eventi_task"
    ADD CONSTRAINT "ev_eventi_task_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_fatture"
    ADD CONSTRAINT "ev_fatture_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."ev_eventi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_fatture"
    ADD CONSTRAINT "ev_fatture_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_fornitori"
    ADD CONSTRAINT "ev_fornitori_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_location"
    ADD CONSTRAINT "ev_location_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ev_offerte"
    ADD CONSTRAINT "ev_offerte_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."ev_clienti"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_offerte"
    ADD CONSTRAINT "ev_offerte_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."ev_eventi"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ev_offerte"
    ADD CONSTRAINT "ev_offerte_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "fk_task" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."internal_activities"
    ADD CONSTRAINT "internal_activities_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."inventory_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_item_variants"
    ADD CONSTRAINT "inventory_item_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_item_variants"
    ADD CONSTRAINT "inventory_item_variants_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_item_variants"
    ADD CONSTRAINT "inventory_item_variants_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."inventory_suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."inventory_item_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inventory_warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_subcategory_images"
    ADD CONSTRAINT "inventory_subcategory_images_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_subcategory_images"
    ADD CONSTRAINT "inventory_subcategory_images_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_suppliers"
    ADD CONSTRAINT "inventory_suppliers_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_warehouses"
    ADD CONSTRAINT "inventory_warehouses_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_access"
    ADD CONSTRAINT "pm_access_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_access"
    ADD CONSTRAINT "pm_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_area_scores"
    ADD CONSTRAINT "pm_area_scores_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_area_scores"
    ADD CONSTRAINT "pm_area_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_automations"
    ADD CONSTRAINT "pm_automations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_data_sources"
    ADD CONSTRAINT "pm_data_sources_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_item_snapshots"
    ADD CONSTRAINT "pm_item_snapshots_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."pm_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_item_snapshots"
    ADD CONSTRAINT "pm_item_snapshots_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_item_snapshots"
    ADD CONSTRAINT "pm_item_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_items"
    ADD CONSTRAINT "pm_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_items"
    ADD CONSTRAINT "pm_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."pm_data_sources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pm_items"
    ADD CONSTRAINT "pm_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_life_areas"
    ADD CONSTRAINT "pm_life_areas_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."righe_documento"
    ADD CONSTRAINT "righe_documento_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "public"."documenti"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."righe_documento"
    ADD CONSTRAINT "righe_documento_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sellproduct_categories"
    ADD CONSTRAINT "sellproduct_categories_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sellproduct_subcategory_images"
    ADD CONSTRAINT "sellproduct_subcategory_images_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."sellproduct_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sellproduct_subcategory_images"
    ADD CONSTRAINT "sellproduct_subcategory_images_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_ai_settings"
    ADD CONSTRAINT "site_ai_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_modules"
    ADD CONSTRAINT "site_modules_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_kanban_category_permissions"
    ADD CONSTRAINT "user_kanban_category_permissions_kanban_category_id_fkey" FOREIGN KEY ("kanban_category_id") REFERENCES "public"."KanbanCategory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_kanban_category_permissions"
    ADD CONSTRAINT "user_kanban_category_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_kanban_permissions"
    ADD CONSTRAINT "user_kanban_permissions_kanban_id_fkey" FOREIGN KEY ("kanban_id") REFERENCES "public"."Kanban"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_kanban_permissions"
    ADD CONSTRAINT "user_kanban_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_module_permissions"
    ADD CONSTRAINT "user_module_permissions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_module_permissions"
    ADD CONSTRAINT "user_module_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_site_select_preferences"
    ADD CONSTRAINT "user_site_select_preferences_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_site_select_preferences"
    ADD CONSTRAINT "user_site_select_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sites"
    ADD CONSTRAINT "user_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sites"
    ADD CONSTRAINT "user_sites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete kanban category permissions" ON "public"."user_kanban_category_permissions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can delete kanban permissions" ON "public"."user_kanban_permissions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can delete module permissions" ON "public"."user_module_permissions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can insert kanban category permissions" ON "public"."user_kanban_category_permissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can insert kanban permissions" ON "public"."user_kanban_permissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can insert module permissions" ON "public"."user_module_permissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can manage categories" ON "public"."sellproduct_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can manage site settings" ON "public"."site_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can update kanban category permissions" ON "public"."user_kanban_category_permissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can update kanban permissions" ON "public"."user_kanban_permissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can update module permissions" ON "public"."user_module_permissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can view all kanban category permissions" ON "public"."user_kanban_category_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can view all kanban permissions" ON "public"."user_kanban_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Admins can view all module permissions for their sites" ON "public"."user_module_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Allow authenticated users to insert sequences" ON "public"."code_sequences" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read sequences" ON "public"."code_sequences" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update sequences" ON "public"."code_sequences" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can delete attendance entries" ON "public"."attendance_entries" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can delete leave requests" ON "public"."leave_requests" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert attendance entries" ON "public"."attendance_entries" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert leave requests" ON "public"."leave_requests" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update attendance entries" ON "public"."attendance_entries" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update leave requests" ON "public"."leave_requests" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."Manufacturer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Manufacturer_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Reseller" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SellProduct" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Superadmins can manage all AI settings" ON "public"."site_ai_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins can manage all organization relationships" ON "public"."user_organizations" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins have full access to manufacturer categories" ON "public"."Manufacturer_category" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins have full access to manufacturers" ON "public"."Manufacturer" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins have full access to resellers" ON "public"."Reseller" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins have full access to supplier categories" ON "public"."Supplier_category" USING ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."User"
  WHERE (("User"."auth_id" = "auth"."uid"()) AND ("User"."role" = 'superadmin'::"text")))));



ALTER TABLE "public"."Supplier_category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "System can manage code sequences" ON "public"."code_sequences" USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."site_id" = "code_sequences"."site_id") AND ("us"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete AI settings for their sites" ON "public"."site_ai_settings" FOR DELETE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete dashboard 3D scenes for their sites" ON "public"."dashboard_3d_scenes" FOR DELETE USING ("public"."dashboard_3d_user_can_access_site"("site_id"));



CREATE POLICY "Users can delete manufacturer categories for their sites" ON "public"."Manufacturer_category" FOR DELETE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete manufacturers for their sites" ON "public"."Manufacturer" FOR DELETE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete resellers for their sites" ON "public"."Reseller" FOR DELETE USING (("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete supplier categories for their sites" ON "public"."Supplier_category" FOR DELETE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own organization relationships" ON "public"."user_organizations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own site relationships" ON "public"."user_sites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert AI settings for their sites" ON "public"."site_ai_settings" FOR INSERT WITH CHECK ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert dashboard 3D scenes for their sites" ON "public"."dashboard_3d_scenes" FOR INSERT WITH CHECK (("public"."dashboard_3d_user_can_access_site"("site_id") AND (("created_by" IS NULL) OR ("created_by" = "auth"."uid"()))));



CREATE POLICY "Users can insert manufacturer categories for their sites" ON "public"."Manufacturer_category" FOR INSERT WITH CHECK ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert manufacturers for their sites" ON "public"."Manufacturer" FOR INSERT WITH CHECK ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert resellers for their sites" ON "public"."Reseller" FOR INSERT WITH CHECK (("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert supplier categories for their sites" ON "public"."Supplier_category" FOR INSERT WITH CHECK ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own organization relationships" ON "public"."user_organizations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own site relationships" ON "public"."user_sites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update AI settings for their sites" ON "public"."site_ai_settings" FOR UPDATE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update dashboard 3D scenes for their sites" ON "public"."dashboard_3d_scenes" FOR UPDATE USING ("public"."dashboard_3d_user_can_access_site"("site_id")) WITH CHECK ("public"."dashboard_3d_user_can_access_site"("site_id"));



CREATE POLICY "Users can update manufacturer categories for their sites" ON "public"."Manufacturer_category" FOR UPDATE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update manufacturers for their sites" ON "public"."Manufacturer" FOR UPDATE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update resellers for their sites" ON "public"."Reseller" FOR UPDATE USING (("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update supplier categories for their sites" ON "public"."Supplier_category" FOR UPDATE USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own organization relationships" ON "public"."user_organizations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own site relationships" ON "public"."user_sites" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view AI settings for their sites" ON "public"."site_ai_settings" FOR SELECT USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view attendance entries for their site" ON "public"."attendance_entries" FOR SELECT USING (true);



CREATE POLICY "Users can view dashboard 3D scenes for their sites" ON "public"."dashboard_3d_scenes" FOR SELECT USING ("public"."dashboard_3d_user_can_access_site"("site_id"));



CREATE POLICY "Users can view leave requests for their site" ON "public"."leave_requests" FOR SELECT USING (true);



CREATE POLICY "Users can view manufacturer categories for their sites" ON "public"."Manufacturer_category" FOR SELECT USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view manufacturers for their sites" ON "public"."Manufacturer" FOR SELECT USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view resellers for their sites" ON "public"."Reseller" FOR SELECT USING (("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view supplier categories for their sites" ON "public"."Supplier_category" FOR SELECT USING ((("site_id" IN ( SELECT "user_sites"."site_id"
   FROM "public"."user_sites"
  WHERE ("user_sites"."user_id" = "auth"."uid"()))) OR ("site_id" IN ( SELECT "s"."id"
   FROM ("public"."sites" "s"
     JOIN "public"."user_organizations" "uo" ON (("s"."organization_id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their code sequences" ON "public"."code_sequences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."site_id" = "code_sequences"."site_id") AND ("us"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own kanban category permissions" ON "public"."user_kanban_category_permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own kanban permissions" ON "public"."user_kanban_permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own module permissions" ON "public"."user_module_permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own organization relationships" ON "public"."user_organizations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own site relationships" ON "public"."user_sites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their site categories" ON "public"."sellproduct_categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."site_id" = "sellproduct_categories"."site_id") AND ("us"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their site settings" ON "public"."site_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."site_id" = "site_settings"."site_id") AND ("us"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."attendance_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_delete_site_access" ON "public"."Client" FOR DELETE TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



CREATE POLICY "client_insert_site_access" ON "public"."Client" FOR INSERT TO "authenticated" WITH CHECK ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



CREATE POLICY "client_select_site_access" ON "public"."Client" FOR SELECT TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



CREATE POLICY "client_update_site_access" ON "public"."Client" FOR UPDATE TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id"))) WITH CHECK ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



ALTER TABLE "public"."code_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_3d_scenes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demo_access_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demo_access_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demo_workspaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documenti" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documenti_delete_site_access" ON "public"."documenti" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "documenti_insert_site_access" ON "public"."documenti" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "documenti_select_site_access" ON "public"."documenti" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "documenti_update_site_access" ON "public"."documenti" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_clienti" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_clienti_delete_site_access" ON "public"."ev_clienti" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_clienti_insert_site_access" ON "public"."ev_clienti" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_clienti_select_site_access" ON "public"."ev_clienti" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_clienti_update_site_access" ON "public"."ev_clienti" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_eventi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_eventi_delete_site_access" ON "public"."ev_eventi" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_eventi_fornitori" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_eventi_fornitori_delete_site_access" ON "public"."ev_eventi_fornitori" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_fornitori_insert_site_access" ON "public"."ev_eventi_fornitori" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_fornitori_select_site_access" ON "public"."ev_eventi_fornitori" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_fornitori_update_site_access" ON "public"."ev_eventi_fornitori" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_insert_site_access" ON "public"."ev_eventi" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_select_site_access" ON "public"."ev_eventi" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_eventi_task" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_eventi_task_delete_site_access" ON "public"."ev_eventi_task" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_task_insert_site_access" ON "public"."ev_eventi_task" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_task_select_site_access" ON "public"."ev_eventi_task" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_task_update_site_access" ON "public"."ev_eventi_task" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_eventi_update_site_access" ON "public"."ev_eventi" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_fatture" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_fatture_delete_site_access" ON "public"."ev_fatture" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fatture_insert_site_access" ON "public"."ev_fatture" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fatture_select_site_access" ON "public"."ev_fatture" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fatture_update_site_access" ON "public"."ev_fatture" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_fornitori" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_fornitori_delete_site_access" ON "public"."ev_fornitori" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fornitori_insert_site_access" ON "public"."ev_fornitori" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fornitori_select_site_access" ON "public"."ev_fornitori" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_fornitori_update_site_access" ON "public"."ev_fornitori" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_location" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_location_delete_site_access" ON "public"."ev_location" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_location_insert_site_access" ON "public"."ev_location" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_location_select_site_access" ON "public"."ev_location" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_location_update_site_access" ON "public"."ev_location" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."ev_offerte" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ev_offerte_delete_site_access" ON "public"."ev_offerte" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_offerte_insert_site_access" ON "public"."ev_offerte" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_offerte_select_site_access" ON "public"."ev_offerte" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "ev_offerte_update_site_access" ON "public"."ev_offerte" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."internal_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "internal_activities_delete" ON "public"."internal_activities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "internal_activities_insert" ON "public"."internal_activities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "internal_activities_select" ON "public"."internal_activities" FOR SELECT TO "authenticated" USING ((("site_id" IS NULL) OR ("site_id" IN ( SELECT "sites"."id"
   FROM "public"."sites"
  WHERE ("sites"."id" = "internal_activities"."site_id")))));



CREATE POLICY "internal_activities_update" ON "public"."internal_activities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "inventory_categories_delete" ON "public"."inventory_categories" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_categories_insert" ON "public"."inventory_categories" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_categories_select" ON "public"."inventory_categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_categories_update" ON "public"."inventory_categories" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_items_delete" ON "public"."inventory_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_items_insert" ON "public"."inventory_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_items_select" ON "public"."inventory_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_items_update" ON "public"."inventory_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_movements_insert" ON "public"."inventory_stock_movements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_movements_select" ON "public"."inventory_stock_movements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



ALTER TABLE "public"."inventory_stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_suppliers_delete" ON "public"."inventory_suppliers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_suppliers_insert" ON "public"."inventory_suppliers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_suppliers_select" ON "public"."inventory_suppliers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_suppliers_update" ON "public"."inventory_suppliers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_units_select" ON "public"."inventory_units" FOR SELECT USING (true);



CREATE POLICY "inventory_variants_delete" ON "public"."inventory_item_variants" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_variants_insert" ON "public"."inventory_item_variants" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_variants_select" ON "public"."inventory_item_variants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_variants_update" ON "public"."inventory_item_variants" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_warehouses_delete" ON "public"."inventory_warehouses" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_warehouses_insert" ON "public"."inventory_warehouses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_warehouses_select" ON "public"."inventory_warehouses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



CREATE POLICY "inventory_warehouses_update" ON "public"."inventory_warehouses" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_sites" "us"
  WHERE (("us"."user_id" = "auth"."uid"()) AND ("us"."site_id" = "us"."site_id")))));



ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pm_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_access_delete_admin" ON "public"."pm_access" FOR DELETE TO "authenticated" USING ("public"."pm_can_manage_access"("site_id"));



CREATE POLICY "pm_access_insert_admin" ON "public"."pm_access" FOR INSERT TO "authenticated" WITH CHECK ("public"."pm_can_manage_access"("site_id"));



CREATE POLICY "pm_access_select_own_or_admin" ON "public"."pm_access" FOR SELECT TO "authenticated" USING ((("public"."user_can_access_site"("site_id") AND ("user_id" = "auth"."uid"())) OR "public"."pm_can_manage_access"("site_id")));



CREATE POLICY "pm_access_update_admin" ON "public"."pm_access" FOR UPDATE TO "authenticated" USING ("public"."pm_can_manage_access"("site_id")) WITH CHECK ("public"."pm_can_manage_access"("site_id"));



ALTER TABLE "public"."pm_area_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_area_scores_insert_own" ON "public"."pm_area_scores" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



CREATE POLICY "pm_area_scores_select_own" ON "public"."pm_area_scores" FOR SELECT TO "authenticated" USING (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



ALTER TABLE "public"."pm_automations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_automations_delete_site_access" ON "public"."pm_automations" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_automations_insert_site_access" ON "public"."pm_automations" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_automations_select_site_access" ON "public"."pm_automations" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_automations_update_site_access" ON "public"."pm_automations" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."pm_data_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_data_sources_delete_site_access" ON "public"."pm_data_sources" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_data_sources_insert_site_access" ON "public"."pm_data_sources" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_data_sources_select_site_access" ON "public"."pm_data_sources" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_data_sources_update_site_access" ON "public"."pm_data_sources" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."pm_item_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_item_snapshots_insert_own" ON "public"."pm_item_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



CREATE POLICY "pm_item_snapshots_select_own" ON "public"."pm_item_snapshots" FOR SELECT TO "authenticated" USING (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



ALTER TABLE "public"."pm_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_items_delete_own" ON "public"."pm_items" FOR DELETE TO "authenticated" USING (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



CREATE POLICY "pm_items_insert_own" ON "public"."pm_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



CREATE POLICY "pm_items_select_own" ON "public"."pm_items" FOR SELECT TO "authenticated" USING (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



CREATE POLICY "pm_items_update_own" ON "public"."pm_items" FOR UPDATE TO "authenticated" USING (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"()))) WITH CHECK (("public"."user_can_access_site"("site_id") AND (("user_id" = "auth"."uid"()) OR "public"."pm_is_superadmin"())));



ALTER TABLE "public"."pm_life_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_life_areas_delete_site_access" ON "public"."pm_life_areas" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_life_areas_insert_site_access" ON "public"."pm_life_areas" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_life_areas_select_site_access" ON "public"."pm_life_areas" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "pm_life_areas_update_site_access" ON "public"."pm_life_areas" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."righe_documento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "righe_documento_delete_site_access" ON "public"."righe_documento" FOR DELETE TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "righe_documento_insert_site_access" ON "public"."righe_documento" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_access_site"("site_id"));



CREATE POLICY "righe_documento_select_site_access" ON "public"."righe_documento" FOR SELECT TO "authenticated" USING ("public"."user_can_access_site"("site_id"));



CREATE POLICY "righe_documento_update_site_access" ON "public"."righe_documento" FOR UPDATE TO "authenticated" USING ("public"."user_can_access_site"("site_id")) WITH CHECK ("public"."user_can_access_site"("site_id"));



ALTER TABLE "public"."sellproduct_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sellproduct_delete_site_access" ON "public"."SellProduct" FOR DELETE TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



CREATE POLICY "sellproduct_insert_site_access" ON "public"."SellProduct" FOR INSERT TO "authenticated" WITH CHECK ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



CREATE POLICY "sellproduct_select_site_access" ON "public"."SellProduct" FOR SELECT TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



ALTER TABLE "public"."sellproduct_subcategory_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sellproduct_subcategory_images_delete" ON "public"."sellproduct_subcategory_images" FOR DELETE USING (true);



CREATE POLICY "sellproduct_subcategory_images_insert" ON "public"."sellproduct_subcategory_images" FOR INSERT WITH CHECK (true);



CREATE POLICY "sellproduct_subcategory_images_select" ON "public"."sellproduct_subcategory_images" FOR SELECT USING (true);



CREATE POLICY "sellproduct_subcategory_images_update" ON "public"."sellproduct_subcategory_images" FOR UPDATE USING (true);



CREATE POLICY "sellproduct_update_site_access" ON "public"."SellProduct" FOR UPDATE TO "authenticated" USING ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id"))) WITH CHECK ((("site_id" IS NOT NULL) AND "public"."user_can_access_site"("site_id")));



ALTER TABLE "public"."site_ai_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "superadmin_can_access_all_sites" ON "public"."sites" USING (("auth"."role"() = 'superadmin'::"text"));



ALTER TABLE "public"."user_kanban_category_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_kanban_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_module_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_site_select_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_manage_own_site_select_preferences" ON "public"."user_site_select_preferences" TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = 'superadmin'::"text")))))) WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."User" "u"
  WHERE (("u"."authId" = ("auth"."uid"())::"text") AND ("u"."role" = 'superadmin'::"text"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."Task";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."User";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."add_default_modules_for_site"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_default_modules_for_site"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_default_modules_for_site"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cerca_articolo"("p_site_id" "uuid", "p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cerca_articolo"("p_site_id" "uuid", "p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cerca_articolo"("p_site_id" "uuid", "p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dashboard_3d_user_can_access_site"("target_site_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_3d_user_can_access_site"("target_site_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_3d_user_can_access_site"("target_site_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ev_handle_offerta_vinta"() TO "anon";
GRANT ALL ON FUNCTION "public"."ev_handle_offerta_vinta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ev_handle_offerta_vinta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("p_site_id" "uuid", "p_sequence_type" "text", "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("p_site_id" "uuid", "p_sequence_type" "text", "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_sequence_value"("p_site_id" "uuid", "p_sequence_type" "text", "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_users"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_users"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_users"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_site_id_from_storage_path"("path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_site_id_from_storage_path"("path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_site_id_from_storage_path"("path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_organization"("user_uuid" "uuid", "org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_organization"("user_uuid" "uuid", "org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_organization"("user_uuid" "uuid", "org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_can_manage_access"("target_site_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pm_can_manage_access"("target_site_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_can_manage_access"("target_site_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_is_superadmin"() TO "anon";
GRANT ALL ON FUNCTION "public"."pm_is_superadmin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_is_superadmin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_record_item_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."pm_record_item_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_record_item_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_seed_life_areas"("target_site_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pm_seed_life_areas"("target_site_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_seed_life_areas"("target_site_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pm_seed_life_areas_on_site"() TO "anon";
GRANT ALL ON FUNCTION "public"."pm_seed_life_areas_on_site"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pm_seed_life_areas_on_site"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_demo_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_demo_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_demo_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_documenti_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_documenti_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_documenti_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_dashboard_3d_scenes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_dashboard_3d_scenes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_dashboard_3d_scenes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_kanban_category_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_kanban_category_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_kanban_category_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_site_ai_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_site_ai_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_site_ai_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_organizations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_organizations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_organizations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_site"("target_site_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_site"("target_site_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_site"("target_site_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."Action" TO "anon";
GRANT ALL ON TABLE "public"."Action" TO "authenticated";
GRANT ALL ON TABLE "public"."Action" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Action_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Action_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Action_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Checklist_item" TO "anon";
GRANT ALL ON TABLE "public"."Checklist_item" TO "authenticated";
GRANT ALL ON TABLE "public"."Checklist_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Checklist_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Checklist_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Checklist_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Client" TO "anon";
GRANT ALL ON TABLE "public"."Client" TO "authenticated";
GRANT ALL ON TABLE "public"."Client" TO "service_role";



GRANT ALL ON TABLE "public"."ClientAddress" TO "anon";
GRANT ALL ON TABLE "public"."ClientAddress" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientAddress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ClientAddress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ClientAddress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ClientAddress_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Client_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Client_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Client_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Department" TO "anon";
GRANT ALL ON TABLE "public"."Department" TO "authenticated";
GRANT ALL ON TABLE "public"."Department" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Department_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Department_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Department_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Errortracking" TO "anon";
GRANT ALL ON TABLE "public"."Errortracking" TO "authenticated";
GRANT ALL ON TABLE "public"."Errortracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Errortracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Errortracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Errortracking_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Exit_checklist" TO "anon";
GRANT ALL ON TABLE "public"."Exit_checklist" TO "authenticated";
GRANT ALL ON TABLE "public"."Exit_checklist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Exit_checklist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Exit_checklist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Exit_checklist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."File" TO "anon";
GRANT ALL ON TABLE "public"."File" TO "authenticated";
GRANT ALL ON TABLE "public"."File" TO "service_role";



GRANT ALL ON SEQUENCE "public"."File_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."File_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."File_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Kanban" TO "anon";
GRANT ALL ON TABLE "public"."Kanban" TO "authenticated";
GRANT ALL ON TABLE "public"."Kanban" TO "service_role";



GRANT ALL ON TABLE "public"."KanbanCategory" TO "anon";
GRANT ALL ON TABLE "public"."KanbanCategory" TO "authenticated";
GRANT ALL ON TABLE "public"."KanbanCategory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."KanbanCategory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."KanbanCategory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."KanbanCategory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."KanbanColumn" TO "anon";
GRANT ALL ON TABLE "public"."KanbanColumn" TO "authenticated";
GRANT ALL ON TABLE "public"."KanbanColumn" TO "service_role";



GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Manufacturer" TO "anon";
GRANT ALL ON TABLE "public"."Manufacturer" TO "authenticated";
GRANT ALL ON TABLE "public"."Manufacturer" TO "service_role";



GRANT ALL ON TABLE "public"."Manufacturer_category" TO "anon";
GRANT ALL ON TABLE "public"."Manufacturer_category" TO "authenticated";
GRANT ALL ON TABLE "public"."Manufacturer_category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Manufacturer_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Manufacturer_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Manufacturer_category_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Manufacturer_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Manufacturer_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Manufacturer_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."PackingControl" TO "anon";
GRANT ALL ON TABLE "public"."PackingControl" TO "authenticated";
GRANT ALL ON TABLE "public"."PackingControl" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PackingControl_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PackingControl_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PackingControl_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."PackingItem" TO "anon";
GRANT ALL ON TABLE "public"."PackingItem" TO "authenticated";
GRANT ALL ON TABLE "public"."PackingItem" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PackingItem_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PackingItem_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PackingItem_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."PackingMasterItem" TO "anon";
GRANT ALL ON TABLE "public"."PackingMasterItem" TO "authenticated";
GRANT ALL ON TABLE "public"."PackingMasterItem" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PackingMasterItem_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PackingMasterItem_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PackingMasterItem_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Product" TO "anon";
GRANT ALL ON TABLE "public"."Product" TO "authenticated";
GRANT ALL ON TABLE "public"."Product" TO "service_role";



GRANT ALL ON TABLE "public"."Product_category" TO "anon";
GRANT ALL ON TABLE "public"."Product_category" TO "authenticated";
GRANT ALL ON TABLE "public"."Product_category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Product_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Product_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Product_category_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Product_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Product_inventoryId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Product_inventoryId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Product_inventoryId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."QcMasterItem" TO "anon";
GRANT ALL ON TABLE "public"."QcMasterItem" TO "authenticated";
GRANT ALL ON TABLE "public"."QcMasterItem" TO "service_role";



GRANT ALL ON SEQUENCE "public"."QcMasterItem_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."QcMasterItem_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."QcMasterItem_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Qc_item" TO "anon";
GRANT ALL ON TABLE "public"."Qc_item" TO "authenticated";
GRANT ALL ON TABLE "public"."Qc_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Qc_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Qc_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Qc_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."QualityControl" TO "anon";
GRANT ALL ON TABLE "public"."QualityControl" TO "authenticated";
GRANT ALL ON TABLE "public"."QualityControl" TO "service_role";



GRANT ALL ON SEQUENCE "public"."QualityControl_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."QualityControl_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."QualityControl_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Reseller" TO "anon";
GRANT ALL ON TABLE "public"."Reseller" TO "authenticated";
GRANT ALL ON TABLE "public"."Reseller" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Reseller_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Reseller_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Reseller_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Roles" TO "anon";
GRANT ALL ON TABLE "public"."Roles" TO "authenticated";
GRANT ALL ON TABLE "public"."Roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."SellProduct" TO "anon";
GRANT ALL ON TABLE "public"."SellProduct" TO "authenticated";
GRANT ALL ON TABLE "public"."SellProduct" TO "service_role";



GRANT ALL ON SEQUENCE "public"."SellProduct_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."SellProduct_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."SellProduct_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Supplier" TO "anon";
GRANT ALL ON TABLE "public"."Supplier" TO "authenticated";
GRANT ALL ON TABLE "public"."Supplier" TO "service_role";



GRANT ALL ON TABLE "public"."Supplier_category" TO "anon";
GRANT ALL ON TABLE "public"."Supplier_category" TO "authenticated";
GRANT ALL ON TABLE "public"."Supplier_category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Supplier_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Supplier_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Supplier_category_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Supplier_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Task" TO "anon";
GRANT ALL ON TABLE "public"."Task" TO "authenticated";
GRANT ALL ON TABLE "public"."Task" TO "service_role";



GRANT ALL ON TABLE "public"."TaskHistory" TO "anon";
GRANT ALL ON TABLE "public"."TaskHistory" TO "authenticated";
GRANT ALL ON TABLE "public"."TaskHistory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."TaskHistory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."TaskHistory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."TaskHistory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."TaskSupplier" TO "anon";
GRANT ALL ON TABLE "public"."TaskSupplier" TO "authenticated";
GRANT ALL ON TABLE "public"."TaskSupplier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."TaskSupplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."TaskSupplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."TaskSupplier_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Task_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Task_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Task_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Timetracking" TO "anon";
GRANT ALL ON TABLE "public"."Timetracking" TO "authenticated";
GRANT ALL ON TABLE "public"."Timetracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Timetracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Timetracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Timetracking_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";



GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."_RolesToTimetracking" TO "anon";
GRANT ALL ON TABLE "public"."_RolesToTimetracking" TO "authenticated";
GRANT ALL ON TABLE "public"."_RolesToTimetracking" TO "service_role";



GRANT ALL ON TABLE "public"."_RolesToUser" TO "anon";
GRANT ALL ON TABLE "public"."_RolesToUser" TO "authenticated";
GRANT ALL ON TABLE "public"."_RolesToUser" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_entries" TO "anon";
GRANT ALL ON TABLE "public"."attendance_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_entries" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."code_sequences" TO "anon";
GRANT ALL ON TABLE "public"."code_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."code_sequences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."code_sequences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."code_sequences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."code_sequences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_3d_scenes" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_3d_scenes" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_3d_scenes" TO "service_role";



GRANT ALL ON TABLE "public"."demo_access_events" TO "anon";
GRANT ALL ON TABLE "public"."demo_access_events" TO "authenticated";
GRANT ALL ON TABLE "public"."demo_access_events" TO "service_role";



GRANT ALL ON TABLE "public"."demo_access_tokens" TO "anon";
GRANT ALL ON TABLE "public"."demo_access_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."demo_access_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."demo_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."demo_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."demo_workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."documenti" TO "anon";
GRANT ALL ON TABLE "public"."documenti" TO "authenticated";
GRANT ALL ON TABLE "public"."documenti" TO "service_role";



GRANT ALL ON TABLE "public"."ev_clienti" TO "anon";
GRANT ALL ON TABLE "public"."ev_clienti" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_clienti" TO "service_role";



GRANT ALL ON TABLE "public"."ev_eventi" TO "anon";
GRANT ALL ON TABLE "public"."ev_eventi" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_eventi" TO "service_role";



GRANT ALL ON TABLE "public"."ev_eventi_fornitori" TO "anon";
GRANT ALL ON TABLE "public"."ev_eventi_fornitori" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_eventi_fornitori" TO "service_role";



GRANT ALL ON TABLE "public"."ev_eventi_task" TO "anon";
GRANT ALL ON TABLE "public"."ev_eventi_task" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_eventi_task" TO "service_role";



GRANT ALL ON TABLE "public"."ev_fatture" TO "anon";
GRANT ALL ON TABLE "public"."ev_fatture" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_fatture" TO "service_role";



GRANT ALL ON TABLE "public"."ev_fornitori" TO "anon";
GRANT ALL ON TABLE "public"."ev_fornitori" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_fornitori" TO "service_role";



GRANT ALL ON TABLE "public"."ev_location" TO "anon";
GRANT ALL ON TABLE "public"."ev_location" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_location" TO "service_role";



GRANT ALL ON TABLE "public"."ev_offerte" TO "anon";
GRANT ALL ON TABLE "public"."ev_offerte" TO "authenticated";
GRANT ALL ON TABLE "public"."ev_offerte" TO "service_role";



GRANT ALL ON TABLE "public"."internal_activities" TO "anon";
GRANT ALL ON TABLE "public"."internal_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."internal_activities" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_categories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_categories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_item_variants" TO "anon";
GRANT ALL ON TABLE "public"."inventory_item_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_item_variants" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_subcategory_images" TO "anon";
GRANT ALL ON TABLE "public"."inventory_subcategory_images" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_subcategory_images" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."inventory_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_units" TO "anon";
GRANT ALL ON TABLE "public"."inventory_units" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_units" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_warehouses" TO "anon";
GRANT ALL ON TABLE "public"."inventory_warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_warehouses" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."pm_access" TO "anon";
GRANT ALL ON TABLE "public"."pm_access" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_access" TO "service_role";



GRANT ALL ON TABLE "public"."pm_area_scores" TO "anon";
GRANT ALL ON TABLE "public"."pm_area_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_area_scores" TO "service_role";



GRANT ALL ON TABLE "public"."pm_automations" TO "anon";
GRANT ALL ON TABLE "public"."pm_automations" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_automations" TO "service_role";



GRANT ALL ON TABLE "public"."pm_data_sources" TO "anon";
GRANT ALL ON TABLE "public"."pm_data_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_data_sources" TO "service_role";



GRANT ALL ON TABLE "public"."pm_item_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."pm_item_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_item_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."pm_items" TO "anon";
GRANT ALL ON TABLE "public"."pm_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_items" TO "service_role";



GRANT ALL ON TABLE "public"."pm_life_areas" TO "anon";
GRANT ALL ON TABLE "public"."pm_life_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_life_areas" TO "service_role";



GRANT ALL ON TABLE "public"."righe_documento" TO "anon";
GRANT ALL ON TABLE "public"."righe_documento" TO "authenticated";
GRANT ALL ON TABLE "public"."righe_documento" TO "service_role";



GRANT ALL ON TABLE "public"."sellproduct_categories" TO "anon";
GRANT ALL ON TABLE "public"."sellproduct_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."sellproduct_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sellproduct_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sellproduct_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sellproduct_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sellproduct_subcategory_images" TO "anon";
GRANT ALL ON TABLE "public"."sellproduct_subcategory_images" TO "authenticated";
GRANT ALL ON TABLE "public"."sellproduct_subcategory_images" TO "service_role";



GRANT ALL ON TABLE "public"."site_ai_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_ai_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_ai_settings" TO "service_role";



GRANT ALL ON TABLE "public"."site_modules" TO "anon";
GRANT ALL ON TABLE "public"."site_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."site_modules" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."site_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."site_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."site_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."user_kanban_category_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_kanban_category_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_kanban_category_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_kanban_category_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_kanban_category_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_kanban_category_permissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_kanban_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_kanban_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_kanban_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_kanban_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_kanban_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_kanban_permissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_module_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_module_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_module_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_module_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_module_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_module_permissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_organizations" TO "anon";
GRANT ALL ON TABLE "public"."user_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."user_site_select_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_site_select_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_site_select_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_sites" TO "anon";
GRANT ALL ON TABLE "public"."user_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sites" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
