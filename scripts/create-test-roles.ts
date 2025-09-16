import { createClient } from "../utils/supabase/server";

async function createTestRoles() {
    const supabase = await createClient();

    const testRoles = [
        { name: "Meccanico" },
        { name: "Operatore CNC" },
        { name: "Controllo Qualità" },
        { name: "Saldatore" },
        { name: "Montatore" },
        { name: "Supervisore" },
    ];

    console.log("Creating test roles...");

    for (const role of testRoles) {
        const { data, error } = await supabase
            .from("Roles")
            .insert({ name: role.name })
            .select();

        if (error) {
            console.error(`Error creating role ${role.name}:`, error);
        } else {
            console.log(`Created role: ${role.name}`, data);
        }
    }

    console.log("Test roles creation completed!");
}

createTestRoles().catch(console.error);
