import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServiceClient();

        // Get list of all tables in the public schema
        const { data: tables, error: tablesError } = await supabase
            .from("information_schema.tables")
            .select("table_name")
            .eq("table_schema", "public")
            .eq("table_type", "BASE TABLE");

        if (tablesError) {
            return NextResponse.json({
                error: "Failed to fetch tables",
                details: tablesError,
                status: 500,
            }, { status: 500 });
        }

        // Get list of all schemas
        const { data: schemas, error: schemasError } = await supabase
            .from("information_schema.schemata")
            .select("schema_name");

        if (schemasError) {
            return NextResponse.json({
                error: "Failed to fetch schemas",
                details: schemasError,
                status: 500,
            }, { status: 500 });
        }

        // Check if specific tables exist
        const tableNames = tables?.map((t) => t.table_name) || [];
        const expectedTables = [
            "product",
            "sell_product",
            "product_category",
            "supplier",
            "client",
            "task",
            "quality_control",
            "packing_control",
        ];

        const tableStatus = expectedTables.map((tableName) => ({
            table: tableName,
            exists: tableNames.includes(tableName),
            foundIn: tableNames.includes(tableName) ? "public" : "missing",
        }));

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            note: "🔍 Database tables debug endpoint",
            status: "✅ Endpoint accessible",
            schemas: schemas?.map((s) => s.schema_name) || [],
            allTables: tableNames,
            expectedTables: tableStatus,
            recommendations: {
                missingTables: tableStatus.filter((t) => !t.exists).map((t) =>
                    t.table
                ),
                note:
                    "If expected tables are missing, you may need to run database migrations or create them manually",
            },
        });
    } catch (error) {
        return NextResponse.json({
            error: "Unexpected error",
            details: String(error),
            status: 500,
        }, { status: 500 });
    }
}
