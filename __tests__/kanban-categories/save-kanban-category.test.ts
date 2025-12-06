import { saveKanbanCategory } from '@/app/sites/[domain]/kanban/actions/save-kanban-category.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData, 
  mockKanbanCategoryData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');
jest.mock('next/cache');

describe('KanbanCategories - saveKanbanCategory', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should create a new category successfully', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
      description: 'Production kanbans',
      icon: 'factory',
      color: '#FF0000',
      display_order: 1,
    };

    const mockCategory = mockKanbanCategoryData({ id: 1, ...categoryData });

    // Mock for identifier check (not exists)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // Mock for category insert
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({ success: true, data: mockCategory });
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should update an existing category successfully', async () => {
    const categoryData = {
      id: 1,
      name: 'Updated Production',
      identifier: 'production',
      description: 'Updated description',
      icon: 'factory',
      color: '#00FF00',
      display_order: 2,
    };

    const mockCategory = mockKanbanCategoryData({ ...categoryData });

    // Mock for identifier check (excluding current category)
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    // Mock for category update
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCategory, error: null }),
          }),
        }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({ success: true, data: mockCategory });
  });

  it('should return error when identifier already exists', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
    };

    // Mock for identifier check (exists)
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { id: 2 }, 
            error: null 
          }),
        }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'A category with this identifier already exists for this site',
    });
  });

  it('should return error when site_id is missing', async () => {
    (getSiteData as jest.Mock).mockResolvedValue({ data: null });

    const categoryData = {
      name: 'Production',
      identifier: 'production',
    };

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Site ID is required',
    });
  });

  it('should include site_id when saving category', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
    };

    const mockCategory = mockKanbanCategoryData({ 
      id: 1, 
      ...categoryData,
      site_id: 'test-site-id'
    });

    // Mock for identifier check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }),
    };

    mockSupabase.mockInsert.mockReturnValue(mockInsertChain);

    await saveKanbanCategory(categoryData, 'test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 'test-site-id',
      })
    );
  });

  it('should set default display_order to 0 if not provided', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
      // display_order not provided
    };

    const mockCategory = mockKanbanCategoryData({ 
      id: 1, 
      ...categoryData,
      display_order: 0 
    });

    // Mock for identifier check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }),
    });

    await saveKanbanCategory(categoryData, 'test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        display_order: 0,
      })
    );
  });

  it('should handle errors when creating category', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
    };

    // Mock for identifier check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // Mock for category insert with error
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' }
        }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Failed to create category',
    });
  });

  it('should handle errors when updating category', async () => {
    const categoryData = {
      id: 1,
      name: 'Updated Production',
      identifier: 'production',
    };

    // Mock for identifier check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    // Mock for category update with error
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' }
            }),
          }),
        }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Failed to update category',
    });
  });

  it('should revalidate path after saving', async () => {
    const categoryData = {
      name: 'Production',
      identifier: 'production',
    };

    const mockCategory = mockKanbanCategoryData({ id: 1, ...categoryData });

    // Mock for identifier check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockCategory, error: null }),
      }),
    });

    const result = await saveKanbanCategory(categoryData, 'test-domain');

    expect(result.success).toBe(true);
    // revalidatePath should have been called (from mock)
  });
});

