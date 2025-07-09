// Test script to verify kanban creation
// Run this with: node scripts/test-kanban-creation.js

const testKanbanCreation = async () => {
  const testKanban = {
    title: "Test Kanban",
    identifier: "TEST-" + Date.now(),
    color: "#3b82f6",
    columns: [
      {
        title: "To Do",
        identifier: "TODO",
        position: 1,
        icon: "faCheck",
      },
      {
        title: "In Progress",
        identifier: "INPROGRESS",
        position: 2,
        icon: "faPlay",
      },
      {
        title: "Done",
        identifier: "DONE",
        position: 3,
        icon: "faCheck",
      },
    ],
  };

  try {
    console.log("Testing kanban creation...");
    console.log("Test data:", JSON.stringify(testKanban, null, 2));

    // Test the save-kanban action
    const { saveKanban } = await import(
      "../app/(user)/kanban/actions/save-kanban.action.ts"
    );

    const result = await saveKanban(testKanban);
    console.log("✅ Kanban created successfully:", result);

    // Test fetching the kanban
    const { getKanbans } = await import(
      "../app/(user)/kanban/actions/get-kanbans.action.ts"
    );
    const kanbans = await getKanbans();

    const createdKanban = kanbans.find(
      (k) => k.identifier === testKanban.identifier
    );
    if (createdKanban) {
      console.log("✅ Kanban found in database:", createdKanban);
    } else {
      console.log("❌ Kanban not found in database");
    }
  } catch (error) {
    console.error("❌ Error testing kanban creation:", error);
  }
};

// Run the test
testKanbanCreation();
