import { getKanbanCategories } from '@/app/sites/[domain]/kanban/actions/get-kanban-categories.action';
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

describe('KanbanCategories - getKanbanCategories', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should fetch categories successfully', async () => {
    const mockCategories = [
      mockKanbanCategoryData({ id: 1, name: 'Production', display_order: 1 }),
      mockKanbanCategoryData({ id: 2, name: 'Development', display_order: 2 }),
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockCategories,
          error: null,
        }),
      }),
    });

    const result = await getKanbanCategories('test-domain');

    expect(result).toEqual(mockCategories);
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return empty array when no categories found', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getKanbanCategories('test-domain');

    expect(result).toEqual([]);
  });

  it('should filter categories by site_id when domain is provided', async () => {
    const mockCategories = [
      mockKanbanCategoryData({ id: 1, site_id: 'test-site-id' }),
    ];

    const mockEq = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockCategories,
          error: null,
        }),
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      }),
    });

    await getKanbanCategories('test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should order categories by display_order ascending', async () => {
    const mockCategories = [
      mockKanbanCategoryData({ id: 1, name: 'Category A', display_order: 1 }),
      mockKanbanCategoryData({ id: 2, name: 'Category B', display_order: 2 }),
      mockKanbanCategoryData({ id: 3, name: 'Category C', display_order: 3 }),
    ];

    const mockOrder = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: mockCategories,
        error: null,
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const result = await getKanbanCategories('test-domain');

    expect(result[0].display_order).toBe(1);
    expect(result[1].display_order).toBe(2);
    expect(result[2].display_order).toBe(3);
  });

  it('should use name as secondary ordering', async () => {
    const mockCategories = [
      mockKanbanCategoryData({ id: 1, name: 'A Category', display_order: 1 }),
      mockKanbanCategoryData({ id: 2, name: 'B Category', display_order: 1 }),
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockCategories,
          error: null,
        }),
      }),
    });

    const result = await getKanbanCategories('test-domain');

    expect(result[0].name).toBe('A Category');
    expect(result[1].name).toBe('B Category');
  });

  it('should throw error when database query fails', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    await expect(getKanbanCategories('test-domain')).rejects.toThrow(
      'Failed to fetch kanban categories'
    );
  });

  it('should work without domain parameter', async () => {
    const mockCategories = [
      mockKanbanCategoryData({ id: 1 }),
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockCategories,
          error: null,
        }),
      }),
    });

    const result = await getKanbanCategories();

    expect(result).toEqual(mockCategories);
    expect(getSiteData).not.toHaveBeenCalled();
  });

  it('should include all category fields', async () => {
    const mockCategory = mockKanbanCategoryData({
      id: 1,
      name: 'Production',
      identifier: 'production',
      description: 'Production kanbans',
      icon: 'factory',
      color: '#FF0000',
      display_order: 1,
      site_id: 'test-site-id',
    });

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: [mockCategory],
          error: null,
        }),
      }),
    });

    const result = await getKanbanCategories('test-domain');

    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('identifier');
    expect(result[0]).toHaveProperty('description');
    expect(result[0]).toHaveProperty('icon');
    expect(result[0]).toHaveProperty('color');
    expect(result[0]).toHaveProperty('display_order');
    expect(result[0]).toHaveProperty('site_id');
  });
});

