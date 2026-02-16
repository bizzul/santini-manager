// Comprehensive types for Supabase entities (replacing Prisma types)

// User related types
export interface User {
    id: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    initials?: string;
    picture?: string;
    created_at?: string;
    updated_at?: string;
}

// Task related types
export type TaskType = "OFFERTA" | "LAVORO" | "FATTURA";
export type DisplayMode = "normal" | "small_green" | "small_red";

export interface Task {
    id: number;
    title?: string;
    unique_code?: string;
    status?: string;
    name?: string;
    luogo?: string;
    description?: string;
    kanban_id?: number;
    column_id?: number;
    archived?: boolean;
    created_at?: string;
    updated_at?: string;
    stoccaggiodate?: string;
    client_id?: number;
    clientId?: number; // Alternative property name
    sell_product_id?: number;
    sellProductId?: number; // Alternative property name
    positions?: string[];
    percent_status?: number;
    percentStatus?: number; // Alternative property name
    sellPrice?: number;
    deliveryDate?: string;
    ora_inizio?: string | null;
    ora_fine?: string | null;
    squadra?: 1 | 2 | null;
    other?: string;
    kanbanId?: number; // Alternative property name
    kanbanColumnId?: number; // Alternative property name for column_id
    material?: boolean;
    metalli?: boolean;
    ferramenta?: boolean;
    legno?: boolean;
    vernice?: boolean;
    altro?: boolean;
    stoccato?: boolean;
    // Campo per numero pezzi
    numero_pezzi?: number | null;
    // Nuovi campi per sistema offerte
    parent_task_id?: number;
    parentTaskId?: number; // Alternative property name
    task_type?: TaskType;
    taskType?: TaskType; // Alternative property name
    display_mode?: DisplayMode;
    displayMode?: DisplayMode; // Alternative property name
    auto_archive_at?: string;
    autoArchiveAt?: string; // Alternative property name
    // Campo per tracking invio offerta
    sent_date?: string;
    sentDate?: string; // Alternative property name
    // Flag per bozze offerta (quick add)
    is_draft?: boolean;
    isDraft?: boolean; // Alternative property name
    // Category IDs selected during draft creation (for filtering products when completing)
    draft_category_ids?: number[];
    draftCategoryIds?: number[]; // Alternative property name
    // Project folder URLs
    cloud_folder_url?: string | null;
    project_files_url?: string | null;
}

// Client related types
export interface Client {
    id: number;
    businessName?: string;
    individualFirstName?: string;
    individualLastName?: string;
    individualTitle?: string;
    clientType?: string;
    clientLanguage?: string;
    code?: string;
    address?: string;
    addressSecondary?: string;
    city?: string;
    countryCode?: string;
    zipCode?: number;
    phone?: string;
    mobilePhone?: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ClientAddress {
    id: number;
    client_id: number;
    type?: string;
    address?: string;
    city?: string;
    countryCode?: string;
    zipCode?: number;
    created_at?: string;
}

// Product related types
export interface Product {
    id: number;
    name?: string;
    description?: string;
    supplier?: string;
    product_category_id?: number;
    supplier_id?: number;
    quantity?: number;
    inventoryId?: number;
    width?: number;
    height?: number;
    length?: number;
    type?: string;
    unit?: string;
    unit_price?: number;
    total_price?: number;
    created_at?: string;
    updated_at?: string;
    // New inventory fields from CSV
    category?: string;
    category_code?: string;
    subcategory?: string;
    subcategory_code?: string;
    subcategory2?: string;
    subcategory2_code?: string;
    color?: string;
    color_code?: string;
    internal_code?: string;
    warehouse_number?: string;
    supplier_code?: string;
    producer?: string;
    producer_code?: string;
    url_tds?: string;
    image_url?: string;
    thickness?: number;
    diameter?: number;
    sell_price?: number;
}

export interface Product_category {
    id: number;
    name?: string;
    code?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SellProductCategory {
    id: number;
    site_id: string;
    name: string;
    description?: string;
    color?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SellProduct {
    id: number;
    name?: string; // Nome del prodotto
    type?: string; // Sottocategoria
    description?: string; // Descrizione
    price_list?: boolean; // Listino prezzi (checkbox)
    image_url?: string; // Immagine
    doc_url?: string; // DOC (link a cartella documenti)
    internal_code?: string; // Codice interno per import CSV
    active?: boolean;
    site_id?: string;
    category_id?: number; // Riferimento a sellproduct_categories
    category?: SellProductCategory; // Relazione
    created_at?: string;
    updated_at?: string;
}

// Supplier category type
export interface Supplier_category {
    id: number;
    name: string;
    code?: string;
    description: string;
    site_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Supplier related types
export interface Supplier {
    id: number;
    name?: string;
    short_name?: string;
    address?: string;
    location?: string;
    category?: string;
    supplier_category_id?: number;
    supplier_category?: Supplier_category;
    phone?: string;
    email?: string;
    website?: string;
    contact?: string;
    cap?: number;
    description?: string;
    supplier_image?: string;
    created_at?: string;
    updated_at?: string;
}

// Manufacturer category type
export interface Manufacturer_category {
    id: number;
    name: string;
    code?: string;
    description: string;
    site_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Manufacturer related types
export interface Manufacturer {
    id: number;
    name: string;
    short_name?: string;
    address?: string;
    location?: string;
    manufacturer_category_id?: number;
    manufacturer_category?: Manufacturer_category;
    phone?: string;
    email?: string;
    website?: string;
    contact?: string;
    cap?: number;
    description?: string;
    manufacturer_image?: string;
    site_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Roles related types
export interface Roles {
    id: number;
    name?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

// Kanban related types
export interface Kanban {
    id: number;
    name?: string;
    title?: string;
    identifier?: string;
    description?: string;
    color?: string;
    icon?: string;
    category_id?: number;
    site_id?: string;
    // Nuovi campi per sistema offerte
    is_offer_kanban?: boolean;
    isOfferKanban?: boolean; // Alternative property name
    target_work_kanban_id?: number;
    targetWorkKanbanId?: number; // Alternative property name
    // Nuovi campi per routing produzione/fatturazione
    is_work_kanban?: boolean;
    isWorkKanban?: boolean; // Alternative property name
    is_production_kanban?: boolean;
    isProductionKanban?: boolean; // Alternative property name
    target_invoice_kanban_id?: number;
    targetInvoiceKanbanId?: number; // Alternative property name
    // Opzione per colorare le card in base alla categoria prodotto
    show_category_colors?: boolean;
    showCategoryColors?: boolean; // Alternative property name
    created_at?: string;
    updated_at?: string;
}

// Tipo colonna kanban
export type ColumnType = "normal" | "won" | "lost" | "production" | "invoicing";

export interface KanbanColumn {
    id: number;
    name?: string;
    title?: string;
    identifier?: string;
    position?: number;
    icon?: string;
    kanban_id?: number;
    kanbanId?: number; // Alternative property name
    // Nuovi campi per sistema offerte
    column_type?: ColumnType;
    columnType?: ColumnType; // Alternative property name
    // Flag per colonna di creazione
    is_creation_column?: boolean;
    isCreationColumn?: boolean; // Alternative property name
    created_at?: string;
    updated_at?: string;
}

// Site Settings
export interface SiteSetting {
    id: number;
    site_id: string;
    setting_key: string;
    setting_value: any; // JSONB
    created_at?: string;
    updated_at?: string;
}

// Code Sequences
export interface CodeSequence {
    id: number;
    site_id: string;
    sequence_type: string;
    year: number;
    current_value: number;
    created_at?: string;
    updated_at?: string;
}

export interface Action {
    id: number;
    type?: string;
    data?: any;
    user_id?: string;
    task_id?: number;
    created_at?: string;
    createdAt?: string; // Alternative property name
}

// Activity types for time tracking
export type TimetrackingActivityType = "project" | "internal";
export type InternalActivityType =
    | "pulizie"
    | "manutenzione"
    | "logistica"
    | "inventario"
    | "formazione"
    | "riunione"
    | "altro";

// Time tracking related types
export interface Timetracking {
    id: number;
    task_id?: number;
    user_id?: string;
    employee_id?: number;
    start_time?: string;
    end_time?: string;
    hours?: number;
    minutes?: number;
    totalTime?: number;
    use_cnc?: boolean;
    description?: string;
    description_category?: string;
    description_type?: string;
    activity_type?: TimetrackingActivityType;
    internal_activity?: InternalActivityType;
    created_at?: string;
    site_id?: string;
    updated_at?: string;
}

// Quality control related types
export interface QualityControl {
    id: number;
    task_id?: number;
    user_id?: string;
    position_nr?: string;
    passed?: string;
    created_at?: string;
    updated_at?: string;
}

export interface QualityControlItem {
    id: number;
    quality_control_id?: number;
    name?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

// Packing control related types
export interface PackingControl {
    id: number;
    task_id?: number;
    user_id?: string;
    passed?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PackingItem {
    id: number;
    packing_control_id?: number;
    name?: string;
    status?: string;
    number?: number;
    package_quantity?: number;
    created_at?: string;
    updated_at?: string;
}

// File related types
export interface File {
    id: number;
    name?: string;
    url?: string;
    type?: string;
    size?: number;
    created_at?: string;
    updated_at?: string;
}

// Error tracking related types
export interface ErrorTracking {
    id: number;
    task_id?: number;
    user_id?: string;
    error_category?: string;
    error_type?: string;
    position?: number;
    supplier_id?: number;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

// ==========================================
// NEW UNIFIED INVENTORY TYPES
// ==========================================

// Unit of measure
export interface InventoryUnit {
    id: string;
    code: string;
    name: string;
    unit_type: "unit" | "weight" | "volume" | "length" | "area" | "other";
    base_unit_id?: string;
    multiplier?: number;
    created_at?: string;
    updated_at?: string;
}

// Inventory category (replaces Product_category for inventory)
export interface InventoryCategory {
    id: string;
    site_id: string;
    name: string;
    description?: string;
    code?: string;
    parent_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Inventory supplier
export interface InventorySupplier {
    id: string;
    site_id: string;
    name: string;
    code?: string;
    notes?: string;
    short_name?: string;
    address?: string;
    location?: string;
    phone?: string;
    email?: string;
    website?: string;
    contact?: string;
    cap?: number;
    supplier_image?: string;
    supplier_category_id?: number;
    created_at?: string;
    updated_at?: string;
}

// Inventory warehouse
export interface InventoryWarehouse {
    id: string;
    site_id: string;
    name: string;
    description?: string;
    code?: string;
    created_at?: string;
    updated_at?: string;
}

// Inventory item (master data)
export interface InventoryItem {
    id: string;
    site_id: string;
    name: string;
    description?: string;
    item_type?: string;
    category_id?: string;
    supplier_id?: string;
    is_stocked: boolean;
    is_consumable: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    // Relations
    category?: InventoryCategory;
    supplier?: InventorySupplier;
    variants?: InventoryItemVariant[];
}

// Variant attributes stored in JSONB
export interface VariantAttributes {
    color?: string;
    color_code?: string;
    width?: number;
    height?: number;
    length?: number;
    thickness?: number;
    diameter?: number;
    category?: string;
    category_code?: string;
    subcategory?: string;
    subcategory_code?: string;
    subcategory2?: string;
    subcategory2_code?: string;
    legacy_unit?: string;
    legacy_inventory_id?: number;
    [key: string]: any;
}

// Inventory item variant
export interface InventoryItemVariant {
    id: string;
    item_id: string;
    site_id: string;
    internal_code?: string;
    supplier_code?: string;
    producer?: string;
    producer_code?: string;
    unit_id?: string;
    purchase_unit_price?: number;
    sell_unit_price?: number;
    attributes: VariantAttributes;
    image_url?: string;
    url_tds?: string;
    warehouse_number?: string;
    created_at?: string;
    updated_at?: string;
    // Relations
    item?: InventoryItem;
    unit?: InventoryUnit;
    // Computed from stock
    current_quantity?: number;
}

// Stock movement types
export type StockMovementType =
    | "opening"
    | "in"
    | "out"
    | "adjust"
    | "transfer_in"
    | "transfer_out";

// Stock movement
export interface InventoryStockMovement {
    id: string;
    site_id: string;
    variant_id: string;
    warehouse_id?: string;
    movement_type: StockMovementType;
    quantity: number;
    unit_id?: string;
    reason?: string;
    reference_type?: string;
    reference_id?: string;
    occurred_at: string;
    created_at?: string;
    // Relations
    variant?: InventoryItemVariant;
    warehouse?: InventoryWarehouse;
    unit?: InventoryUnit;
}

// Stock view (computed)
export interface InventoryStock {
    site_id: string;
    variant_id: string;
    warehouse_id?: string;
    quantity: number;
}

// Extended variant with stock info for display
export interface InventoryVariantWithStock extends InventoryItemVariant {
    item: InventoryItem;
    stock_quantity: number;
    lastAction?: {
        createdAt: string;
        type: string;
        User?: {
            given_name: string | null;
            family_name: string | null;
            picture: string | null;
            initials: string | null;
        };
    } | null;
}

// ==========================================
// LEGACY INVENTORY TYPES (kept for backwards compatibility)
// ==========================================

// Legacy Inventory type
export interface Inventory {
    id: number;
    product_id?: number;
    quantity?: number;
    location?: string;
    created_at?: string;
    updated_at?: string;
}
