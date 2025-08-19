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
export interface Task {
    id: number;
    title?: string;
    unique_code?: string;
    status?: string;
    name?: string;
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
    other?: string;
    kanbanId?: number; // Alternative property name
    material?: boolean;
    metalli?: boolean;
    ferramenta?: boolean;
    legno?: boolean;
    vernice?: boolean;
    altro?: boolean;
    stoccato?: boolean;
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
    city?: string;
    countryCode?: string;
    zipCode?: number;
    phone?: string;
    mobile?: string;
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
    total_price?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Product_category {
    id: number;
    name?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SellProduct {
    id: number;
    name?: string;
    type?: string;
    description?: string;
    active?: boolean;
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
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface KanbanColumn {
    id: number;
    name?: string;
    title?: string;
    identifier?: string;
    position?: number;
    kanban_id?: number;
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
    created_at?: string;
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

// Inventory related types
export interface Inventory {
    id: number;
    product_id?: number;
    quantity?: number;
    location?: string;
    created_at?: string;
    updated_at?: string;
}
