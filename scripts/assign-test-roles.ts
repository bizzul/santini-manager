import { createClient } from "../utils/supabase/server";

async function assignTestRoles() {
    const supabase = await createClient();

    // Get a user to assign roles to (you'll need to replace this with an actual user authId)
    const { data: users, error: usersError } = await supabase
        .from("User")
        .select("id, authId, given_name, family_name")
        .eq("enabled", true)
        .limit(1);

    if (usersError || !users || users.length === 0) {
        console.error("No users found:", usersError);
        return;
    }

    const testUser = users[0];
    console.log(
        "Assigning roles to user:",
        testUser.given_name,
        testUser.family_name,
    );

    // Get some test roles
    const { data: roles, error: rolesError } = await supabase
        .from("Roles")
        .select("id, name")
        .in("name", ["Meccanico", "Operatore CNC", "Controllo Qualità"])
        .limit(3);

    if (rolesError || !roles) {
        console.error("Error fetching roles:", rolesError);
        return;
    }

    console.log("Found roles:", roles);

    // Assign roles to the user
    for (const role of roles) {
        const { data, error } = await supabase
            .from("_RolesToUser")
            .insert({ A: role.id, B: testUser.id })
            .select();

        if (error) {
            console.error(`Error assigning role ${role.name}:`, error);
        } else {
            console.log(
                `Assigned role: ${role.name} to user ${testUser.given_name} ${testUser.family_name}`,
            );
        }
    }

    console.log("Test role assignment completed!");
}

assignTestRoles().catch(console.error);
