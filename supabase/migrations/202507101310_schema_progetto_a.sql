

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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


CREATE OR REPLACE FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    EXECUTE format('CREATE TABLE %I.users (id UUID PRIMARY KEY, name TEXT, lastName TEXT, role TEXT, organization_id UUID REFERENCES public.organizations(id))', schema_name);
END;$$;


ALTER FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") RETURNS TABLE("id" "uuid", "name" "text", "role" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY EXECUTE format('SELECT id, name, role FROM %I.users', schema_name);
END;
$$;


ALTER FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public."User" (
        "email",
        "authId",
        "given_name",
        "family_name",
        "picture"
    )
    VALUES (
        NEW.email,
        NEW.id,
        CAST(NEW.raw_user_meta_data->>'given_name' AS TEXT),
        CAST(NEW.raw_user_meta_data->>'family_name' AS TEXT),
        CAST(NEW.raw_user_meta_data->>'picture' AS TEXT)
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    EXECUTE format('INSERT INTO %I.users (id, name, lastName, role) VALUES ($1, $2, $3)', schema_name)
    USING user_id, first_name, last_name, 'admin';
END;
$_$;


ALTER FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Action" (
    "id" integer NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "supplierId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer NOT NULL,
    "taskId" integer,
    "clientId" integer,
    "productId" integer
);


ALTER TABLE "public"."Action" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Action_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Action_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."Checklist_item_id_seq" OWNER TO "postgres";


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
    "longitude" double precision
);


ALTER TABLE "public"."Client" OWNER TO "postgres";


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


ALTER TABLE "public"."ClientAddress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ClientAddress_id_seq" OWNED BY "public"."ClientAddress"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Client_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Client_id_seq" OWNED BY "public"."Client"."id";



CREATE TABLE IF NOT EXISTS "public"."Department" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "description" character varying NOT NULL
);


ALTER TABLE "public"."Department" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Department_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Department_id_seq" OWNER TO "postgres";


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
    "position" "text" NOT NULL,
    "description" character varying NOT NULL
);


ALTER TABLE "public"."Errortracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Errortracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Errortracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Errortracking_id_seq" OWNED BY "public"."Errortracking"."id";



CREATE TABLE IF NOT EXISTS "public"."Exit_checklist" (
    "id" integer NOT NULL,
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "name" character varying NOT NULL,
    "task_id" integer NOT NULL,
    "employee_id" integer NOT NULL,
    "position" character varying NOT NULL,
    "date" timestamp(6) without time zone NOT NULL
);


ALTER TABLE "public"."Exit_checklist" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Exit_checklist_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Exit_checklist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Exit_checklist_id_seq" OWNED BY "public"."Exit_checklist"."id";



CREATE TABLE IF NOT EXISTS "public"."File" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "cloudinaryId" "text" NOT NULL,
    "taskId" integer,
    "errortrackingId" integer
);


ALTER TABLE "public"."File" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."File_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."File_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."File_id_seq" OWNED BY "public"."File"."id";



CREATE TABLE IF NOT EXISTS "public"."Kanban" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "identifier" "text" NOT NULL
);


ALTER TABLE "public"."Kanban" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."KanbanColumn" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "position" integer NOT NULL,
    "kanbanId" integer NOT NULL
);


ALTER TABLE "public"."KanbanColumn" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."KanbanColumn_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."KanbanColumn_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."KanbanColumn_id_seq" OWNED BY "public"."KanbanColumn"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Kanban_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Kanban_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Kanban_id_seq" OWNED BY "public"."Kanban"."id";



CREATE TABLE IF NOT EXISTS "public"."PackingControl" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "passed" "public"."QC_Status" DEFAULT 'NOT_DONE'::"public"."QC_Status" NOT NULL,
    "taskId" integer NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE "public"."PackingControl" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."PackingControl_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."PackingControl_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."PackingItem_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."PackingItem_id_seq" OWNED BY "public"."PackingItem"."id";



CREATE TABLE IF NOT EXISTS "public"."PackingMasterItem" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."PackingMasterItem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."PackingMasterItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."PackingMasterItem_id_seq" OWNER TO "postgres";


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
    "categoryId" integer
);


ALTER TABLE "public"."Product" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Product_category" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "description" character varying NOT NULL
);


ALTER TABLE "public"."Product_category" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Product_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Product_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_category_id_seq" OWNED BY "public"."Product_category"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Product_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_id_seq" OWNED BY "public"."Product"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Product_inventoryId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Product_inventoryId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Product_inventoryId_seq" OWNED BY "public"."Product"."inventoryId";



CREATE TABLE IF NOT EXISTS "public"."QcMasterItem" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."QcMasterItem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."QcMasterItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."QcMasterItem_id_seq" OWNER TO "postgres";


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


ALTER TABLE "public"."Qc_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Qc_item_id_seq" OWNED BY "public"."Qc_item"."id";



CREATE TABLE IF NOT EXISTS "public"."QualityControl" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "position_nr" "text" NOT NULL,
    "passed" "public"."QC_Status" DEFAULT 'NOT_DONE'::"public"."QC_Status" NOT NULL,
    "taskId" integer NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE "public"."QualityControl" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."QualityControl_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."QualityControl_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."QualityControl_id_seq" OWNED BY "public"."QualityControl"."id";



CREATE TABLE IF NOT EXISTS "public"."Roles" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."Roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Roles_id_seq" OWNED BY "public"."Roles"."id";



CREATE TABLE IF NOT EXISTS "public"."SellProduct" (
    "created_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."SellProduct" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."SellProduct_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."SellProduct_id_seq" OWNER TO "postgres";


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
    "category" character varying,
    "short_name" "text"
);


ALTER TABLE "public"."Supplier" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Supplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Supplier_id_seq" OWNER TO "postgres";


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
    "stoccaggiodate" timestamp(6) without time zone
);


ALTER TABLE "public"."Task" OWNER TO "postgres";


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


ALTER TABLE "public"."TaskHistory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."TaskHistory_id_seq" OWNED BY "public"."TaskHistory"."id";



CREATE TABLE IF NOT EXISTS "public"."TaskSupplier" (
    "id" integer NOT NULL,
    "taskId" integer NOT NULL,
    "supplierId" integer NOT NULL,
    "deliveryDate" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."TaskSupplier" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."TaskSupplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."TaskSupplier_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."TaskSupplier_id_seq" OWNED BY "public"."TaskSupplier"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."Task_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Task_id_seq" OWNER TO "postgres";


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
    "minutes" integer
);


ALTER TABLE "public"."Timetracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Timetracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Timetracking_id_seq" OWNER TO "postgres";


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
    "enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."User_id_seq" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


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
    "logo" "text"
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Action" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Action_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Checklist_item" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Checklist_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Client" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Client_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ClientAddress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ClientAddress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Department" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Department_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Errortracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Errortracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Exit_checklist" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Exit_checklist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."File" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."File_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Kanban" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Kanban_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."KanbanColumn" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."KanbanColumn_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingControl" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingControl_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."PackingMasterItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PackingMasterItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Product_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product" ALTER COLUMN "inventoryId" SET DEFAULT "nextval"('"public"."Product_inventoryId_seq"'::"regclass");



ALTER TABLE ONLY "public"."Product_category" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Product_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."QcMasterItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."QcMasterItem_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Qc_item" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Qc_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."QualityControl" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."QualityControl_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."SellProduct" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."SellProduct_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Supplier" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Supplier_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Task" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Task_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."TaskHistory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."TaskHistory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."TaskSupplier" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."TaskSupplier_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Timetracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Timetracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."User" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."User_id_seq"'::"regclass");



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
    ADD CONSTRAINT "File_cloudinaryId_key" UNIQUE ("cloudinaryId");



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "public"."Kanban"
    ADD CONSTRAINT "Kanban_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."Roles"
    ADD CONSTRAINT "Roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."Roles"
    ADD CONSTRAINT "Roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SellProduct"
    ADD CONSTRAINT "SellProduct_pkey" PRIMARY KEY ("id");



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
    ADD CONSTRAINT "Task_unique_code_key" UNIQUE ("unique_code");



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



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_custom_domain_key" UNIQUE ("custom_domain");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_exit_checklist_employee_id" ON "public"."Exit_checklist" USING "btree" ("employee_id");



CREATE INDEX "idx_exit_checklist_task_id" ON "public"."Exit_checklist" USING "btree" ("task_id");



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Action"
    ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ClientAddress"
    ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."Supplier"("id");



ALTER TABLE ONLY "public"."Errortracking"
    ADD CONSTRAINT "Errortracking_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_errortrackingId_fkey" FOREIGN KEY ("errortrackingId") REFERENCES "public"."Errortracking"("id");



ALTER TABLE ONLY "public"."File"
    ADD CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."KanbanColumn"
    ADD CONSTRAINT "KanbanColumn_kanbanId_fkey" FOREIGN KEY ("kanbanId") REFERENCES "public"."Kanban"("id");



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."PackingControl"
    ADD CONSTRAINT "PackingControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."PackingItem"
    ADD CONSTRAINT "PackingItem_packingControlId_fkey" FOREIGN KEY ("packingControlId") REFERENCES "public"."PackingControl"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Product_category"("id");



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id");



ALTER TABLE ONLY "public"."Qc_item"
    ADD CONSTRAINT "Qc_item_qualityControlId_fkey" FOREIGN KEY ("qualityControlId") REFERENCES "public"."QualityControl"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."QualityControl"
    ADD CONSTRAINT "QualityControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."TaskHistory"
    ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id");



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
    ADD CONSTRAINT "Task_sellProductId_fkey" FOREIGN KEY ("sellProductId") REFERENCES "public"."SellProduct"("id");



ALTER TABLE ONLY "public"."Task"
    ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Timetracking"
    ADD CONSTRAINT "Timetracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id");



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



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."User"("id");



ALTER TABLE ONLY "public"."Exit_checklist"
    ADD CONSTRAINT "fk_task" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id and superadmin" ON "public"."tenants" FOR DELETE USING ((("auth"."role"() = 'superadmin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Enable insert for authenticated users" ON "public"."company_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."company_settings" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."company_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_can_access_their_own_sites" ON "public"."sites" USING ((EXISTS ( SELECT 1
   FROM "public"."tenants"
  WHERE (("tenants"."user_id" = "auth"."uid"()) AND ("tenants"."organization_id" = "sites"."organization_id")))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "superadmin_and_tenant_can_update" ON "public"."tenants" FOR UPDATE USING ((("auth"."role"() = 'superadmin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "superadmin_and_tenant_can_view" ON "public"."tenants" FOR SELECT USING ((("auth"."role"() = 'superadmin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "superadmin_can_access_all_sites" ON "public"."sites" USING (("auth"."role"() = 'superadmin'::"text"));



CREATE POLICY "superuser only" ON "public"."organizations" USING (("auth"."role"() = 'superadmin '::"text"));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_schema"("org_id" "uuid", "schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_users_from_schema"("schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_user_profile_admin"("schema_name" "text", "user_id" "uuid", "first_name" "text", "last_name" "text") TO "service_role";



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



GRANT ALL ON TABLE "public"."KanbanColumn" TO "anon";
GRANT ALL ON TABLE "public"."KanbanColumn" TO "authenticated";
GRANT ALL ON TABLE "public"."KanbanColumn" TO "service_role";



GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."KanbanColumn_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Kanban_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
