import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import {
  mockKanbanColumnData,
  mockKanbanData,
  mockSiteData,
  mockSupabaseClient,
} from "../setup/mocks";

// Mock dependencies
jest.mock("@/utils/supabase/server");
jest.mock("@/lib/fetchers");
jest.mock("next/cache");

describe("Kanban - saveKanban", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it("should create a new kanban successfully", async () => {
    const kanbanData = {
      title: "New Kanban",
      identifier: "new-kanban",
      color: "#000000",
      category_id: 1,
      columns: [
        { title: "Todo", identifier: "todo", position: 1 },
        { title: "In Progress", identifier: "in-progress", position: 2 },
        { title: "Done", identifier: "done", position: 3 },
      ],
    };

    const mockKanban = mockKanbanData({
      id: 1,
      ...kanbanData,
    });

    // Mock for existing kanban check (not found)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    });

    // Mock for kanban insert
    mockSupabase.mockInsert.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for existing columns check
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [],
      error: null,
    });

    // Mock for column inserts
    kanbanData.columns.forEach(() => {
      mockSupabase.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockKanbanColumnData(),
            error: null,
          }),
        }),
      });
    });

    const result = await saveKanban(kanbanData, "test-domain");

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(getSiteData).toHaveBeenCalledWith("test-domain");
  });

  it("should update an existing kanban", async () => {
    const kanbanData = {
      id: 1,
      title: "Updated Kanban",
      identifier: "existing-kanban",
      color: "#FF0000",
      category_id: 2,
      columns: [
        { id: 1, title: "Todo", identifier: "todo", position: 1 },
      ],
    };

    const existingKanban = mockKanbanData({
      id: 1,
      identifier: "existing-kanban",
    });

    const updatedKanban = mockKanbanData({
      ...kanbanData,
    });

    // Mock for existing kanban check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: existingKanban,
          error: null,
        }),
      }),
    });

    // Mock for kanban update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: updatedKanban,
            error: null,
          }),
        }),
      }),
    });

    // Mock for existing columns
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [mockKanbanColumnData({ id: 1 })],
      error: null,
    });

    // Mock for column update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockKanbanColumnData(),
            error: null,
          }),
        }),
      }),
    });

    const result = await saveKanban(kanbanData, "test-domain");

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it("should skip column updates when skipColumnUpdates flag is set", async () => {
    const kanbanData = {
      id: 1,
      title: "Updated Kanban",
      identifier: "existing-kanban",
      color: "#FF0000",
      category_id: 2,
      columns: [],
      skipColumnUpdates: true,
    };

    const existingKanban = mockKanbanData({
      id: 1,
      identifier: "existing-kanban",
    });

    // Mock for existing kanban check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: existingKanban,
          error: null,
        }),
      }),
    });

    // Mock for kanban update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: existingKanban,
            error: null,
          }),
        }),
      }),
    });

    // Mock for existing columns fetch (only for reading, no updates)
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        data: [mockKanbanColumnData()],
        error: null,
      }),
    });

    const result = await saveKanban(kanbanData, "test-domain");

    expect(result).toBeDefined();
    // Should not have called update or delete on columns
    expect(mockSupabase.mockDelete).not.toHaveBeenCalled();
  });

  it("should delete columns that are no longer present", async () => {
    const kanbanData = {
      id: 1,
      title: "Updated Kanban",
      identifier: "existing-kanban",
      color: "#FF0000",
      columns: [
        { id: 1, title: "Todo", identifier: "todo", position: 1 },
      ],
    };

    const existingKanban = mockKanbanData({ id: 1 });
    const existingColumns = [
      mockKanbanColumnData({ id: 1 }),
      mockKanbanColumnData({ id: 2 }), // This will be deleted
    ];

    // Mock for existing kanban check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: existingKanban,
          error: null,
        }),
      }),
    });

    // Mock for kanban update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: existingKanban,
            error: null,
          }),
        }),
      }),
    });

    // Mock for existing columns
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: existingColumns,
      error: null,
    });

    // Mock for tasks check (no tasks associated)
    mockSupabase.mockSelect.mockReturnValueOnce({
      in: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for column delete
    mockSupabase.mockDelete.mockReturnValueOnce({
      in: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for column update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockKanbanColumnData(),
            error: null,
          }),
        }),
      }),
    });

    const result = await saveKanban(kanbanData, "test-domain");

    expect(result).toBeDefined();
  });

  it("should throw error when trying to delete columns with tasks", async () => {
    const kanbanData = {
      id: 1,
      title: "Updated Kanban",
      identifier: "existing-kanban",
      columns: [
        { id: 1, title: "Todo", identifier: "todo", position: 1 },
      ],
    };

    const existingKanban = mockKanbanData({ id: 1 });
    const existingColumns = [
      mockKanbanColumnData({ id: 1 }),
      mockKanbanColumnData({ id: 2 }), // This has tasks
    ];

    // Mock for existing kanban check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: existingKanban,
          error: null,
        }),
      }),
    });

    // Mock for kanban update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: existingKanban,
            error: null,
          }),
        }),
      }),
    });

    // Mock for existing columns
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: existingColumns,
      error: null,
    });

    // Mock for tasks check (has tasks)
    mockSupabase.mockSelect.mockReturnValueOnce({
      in: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [{ kanbanColumnId: 2 }],
          error: null,
        }),
      }),
    });

    await expect(saveKanban(kanbanData, "test-domain")).rejects.toThrow(
      "Cannot delete columns that have tasks",
    );
  });

  it("should create new columns for a kanban", async () => {
    const kanbanData = {
      id: 1,
      title: "Existing Kanban",
      identifier: "existing-kanban",
      columns: [
        {
          id: 1,
          title: "Existing Column",
          identifier: "existing",
          position: 1,
        },
        { title: "New Column", identifier: "new-column", position: 2 }, // No ID = new
      ],
    };

    const existingKanban = mockKanbanData({ id: 1 });

    // Mock for existing kanban check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: existingKanban,
          error: null,
        }),
      }),
    });

    // Mock for kanban update
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: existingKanban,
            error: null,
          }),
        }),
      }),
    });

    // Mock for existing columns
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [mockKanbanColumnData({ id: 1 })],
      error: null,
    });

    // Mock for column update (existing column)
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockKanbanColumnData({ id: 1 }),
            error: null,
          }),
        }),
      }),
    });

    // Mock for column insert (new column)
    mockSupabase.mockInsert.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockKanbanColumnData({ id: 2, identifier: "new-column" }),
          error: null,
        }),
      }),
    });

    const result = await saveKanban(kanbanData, "test-domain");

    expect(result).toBeDefined();
    expect(result.columns).toBeDefined();
  });

  it("should handle errors when creating kanban", async () => {
    const kanbanData = {
      title: "New Kanban",
      identifier: "new-kanban",
      columns: [],
    };

    // Mock for existing kanban check (not found)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    });

    // Mock for kanban insert with error
    mockSupabase.mockInsert.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error", code: "DB_ERROR" },
        }),
      }),
    });

    await expect(saveKanban(kanbanData, "test-domain")).rejects.toThrow(
      "Failed to create kanban: Database error",
    );
  });

  it("should include site_id when domain is provided", async () => {
    const kanbanData = {
      title: "New Kanban",
      identifier: "new-kanban",
      columns: [],
    };

    const mockKanban = mockKanbanData({
      id: 1,
      ...kanbanData,
      site_id: "test-site-id",
    });

    // Mock for existing kanban check (not found)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }),
    });

    // Mock for kanban insert
    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    };
    mockSupabase.mockInsert.mockReturnValue(mockInsertChain);

    // Mock for existing columns check
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [],
      error: null,
    });

    await saveKanban(kanbanData, "test-domain");

    expect(getSiteData).toHaveBeenCalledWith("test-domain");
    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: "test-site-id",
      }),
    );
  });
});
