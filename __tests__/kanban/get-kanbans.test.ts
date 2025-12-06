import { getKanbans } from '@/app/sites/[domain]/kanban/actions/get-kanbans.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData, 
  mockKanbanData,
  mockKanbanColumnData,
  mockKanbanCategoryData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');

describe('Kanban - getKanbans', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should fetch kanbans successfully', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1, title: 'Kanban 1' }),
        columns: [mockKanbanColumnData({ id: 1 })],
        category: mockKanbanCategoryData({ id: 1 }),
      },
      {
        ...mockKanbanData({ id: 2, title: 'Kanban 2' }),
        columns: [mockKanbanColumnData({ id: 2 })],
        category: mockKanbanCategoryData({ id: 2 }),
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
          error: null,
        }),
      }),
    });

    const result = await getKanbans('test-domain');

    expect(result).toEqual(mockKanbans);
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return empty array when no kanbans found', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getKanbans('test-domain');

    expect(result).toEqual([]);
  });

  it('should filter kanbans by site_id when domain is provided', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1, site_id: 'test-site-id' }),
        columns: [],
        category: null,
      },
    ];

    const mockEq = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
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

    await getKanbans('test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should include columns for each kanban', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1 }),
        columns: [
          mockKanbanColumnData({ id: 1, position: 1 }),
          mockKanbanColumnData({ id: 2, position: 2 }),
          mockKanbanColumnData({ id: 3, position: 3 }),
        ],
        category: null,
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
          error: null,
        }),
      }),
    });

    const result = await getKanbans('test-domain');

    expect(result[0].columns).toHaveLength(3);
    expect(result[0].columns[0].position).toBe(1);
  });

  it('should include category information for each kanban', async () => {
    const mockCategory = mockKanbanCategoryData({ 
      id: 1, 
      name: 'Production' 
    });

    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1, category_id: 1 }),
        columns: [],
        category: mockCategory,
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
          error: null,
        }),
      }),
    });

    const result = await getKanbans('test-domain');

    expect(result[0].category).toBeDefined();
    expect(result[0].category.name).toBe('Production');
  });

  it('should order kanbans by title ascending', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1, title: 'A Kanban' }),
        columns: [],
        category: null,
      },
      {
        ...mockKanbanData({ id: 2, title: 'B Kanban' }),
        columns: [],
        category: null,
      },
    ];

    const mockOrder = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: mockKanbans,
        error: null,
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const result = await getKanbans('test-domain');

    expect(result[0].title).toBe('A Kanban');
    expect(result[1].title).toBe('B Kanban');
  });

  it('should order columns by position ascending', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1 }),
        columns: [
          mockKanbanColumnData({ id: 1, position: 1, title: 'Todo' }),
          mockKanbanColumnData({ id: 2, position: 2, title: 'In Progress' }),
          mockKanbanColumnData({ id: 3, position: 3, title: 'Done' }),
        ],
        category: null,
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
          error: null,
        }),
      }),
    });

    const result = await getKanbans('test-domain');

    expect(result[0].columns[0].title).toBe('Todo');
    expect(result[0].columns[1].title).toBe('In Progress');
    expect(result[0].columns[2].title).toBe('Done');
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

    await expect(getKanbans('test-domain')).rejects.toThrow(
      'Failed to fetch kanbans'
    );
  });

  it('should work without domain parameter', async () => {
    const mockKanbans = [
      {
        ...mockKanbanData({ id: 1 }),
        columns: [],
        category: null,
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockKanbans,
          error: null,
        }),
      }),
    });

    const result = await getKanbans();

    expect(result).toEqual(mockKanbans);
    expect(getSiteData).not.toHaveBeenCalled();
  });
});

