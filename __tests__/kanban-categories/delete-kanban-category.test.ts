import { deleteKanbanCategory } from '@/app/sites/[domain]/kanban/actions/delete-kanban-category.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');
jest.mock('next/cache');

describe('KanbanCategories - deleteKanbanCategory', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should delete a category successfully when not in use', async () => {
    // Mock for kanbans check (no kanbans using this category)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for category delete
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({ success: true });
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when category is in use', async () => {
    // Mock for kanbans check (has kanbans using this category)
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [{ id: 1 }],
          error: null,
        }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: "Cannot delete category because it's being used by one or more kanbans. Please reassign or delete those kanbans first.",
    });
  });

  it('should return error when site_id is missing', async () => {
    (getSiteData as jest.Mock).mockResolvedValue({ data: null });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Site ID is required',
    });
  });

  it('should check if category is used by kanbans before deletion', async () => {
    const mockEq = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    await deleteKanbanCategory(1, 'test-domain');

    expect(mockEq).toHaveBeenCalledWith('category_id', 1);
  });

  it('should filter by site_id when deleting category', async () => {
    // Mock for kanbans check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const mockDeleteEq = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.mockDelete.mockReturnValue({
      eq: mockDeleteEq,
    });

    await deleteKanbanCategory(1, 'test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should handle errors when checking kanbans', async () => {
    // Mock for kanbans check with error
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Failed to check if category is in use',
    });
  });

  it('should handle errors when deleting category', async () => {
    // Mock for kanbans check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for category delete with error
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          error: { message: 'Cannot delete' }
        }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Failed to delete category',
    });
  });

  it('should revalidate path after successful deletion', async () => {
    // Mock for kanbans check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for category delete
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result.success).toBe(true);
    // revalidatePath should have been called (from mock)
  });

  it('should not delete when multiple kanbans use the category', async () => {
    // Mock for kanbans check (multiple kanbans)
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [{ id: 1 }, { id: 2 }, { id: 3 }],
          error: null,
        }),
      }),
    });

    const result = await deleteKanbanCategory(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: "Cannot delete category because it's being used by one or more kanbans. Please reassign or delete those kanbans first.",
    });
    expect(mockSupabase.mockDelete).not.toHaveBeenCalled();
  });

  it('should handle missing domain gracefully', async () => {
    (getSiteData as jest.Mock).mockRejectedValue(new Error('Domain not found'));

    const result = await deleteKanbanCategory(1, 'invalid-domain');

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch site data',
    });
  });
});

