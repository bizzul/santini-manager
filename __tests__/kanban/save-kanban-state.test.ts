import { saveState } from '@/app/sites/[domain]/kanban/actions/save-kanban-state.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData, 
  mockTaskData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');
jest.mock('next/cache');

describe('Kanban - saveKanbanState', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should save state successfully when cooldown has passed', async () => {
    const mockTasks = [
      mockTaskData({ id: 1 }),
      mockTaskData({ id: 2 }),
    ];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check (cooldown passed)
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [
            {
              createdAt: new Date(Date.now() - 400000).toISOString(), // 6+ minutes ago
            },
          ],
          error: null,
        }),
      }),
    });

    // Mock for TaskHistory inserts
    mockTasks.forEach(() => {
      mockSupabase.mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });
    });

    const result = await saveState('test-domain');

    expect(result).toEqual({ success: true });
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should not save state when cooldown has not passed', async () => {
    const mockTasks = [mockTaskData({ id: 1 })];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check (cooldown not passed)
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [
            {
              createdAt: new Date(Date.now() - 100000).toISOString(), // Less than 5 minutes ago
            },
          ],
          error: null,
        }),
      }),
    });

    const result = await saveState('test-domain');

    expect(result).toEqual({ 
      success: false, 
      error: 'Too soon since last snapshot' 
    });
  });

  it('should save state when no previous snapshots exist', async () => {
    const mockTasks = [mockTaskData({ id: 1 })];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check (no snapshots)
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for TaskHistory insert
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    });

    const result = await saveState('test-domain');

    expect(result).toEqual({ success: true });
  });

  it('should include task data in snapshot', async () => {
    const mockTask = mockTaskData({ 
      id: 1, 
      name: 'Test Task',
      kanbanId: 1,
      kanbanColumnId: 1 
    });

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [mockTask],
      error: null,
    });

    // Mock for latest snapshot check
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    };

    mockSupabase.mockInsert.mockReturnValue(mockInsertChain);

    await saveState('test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 1,
        snapshot: expect.objectContaining({
          id: 1,
          name: 'Test Task',
          kanbanId: 1,
          kanbanColumnId: 1,
        }),
      })
    );
  });

  it('should handle errors when fetching current tasks', async () => {
    // Mock for current tasks - with error
    mockSupabase.mockSelect.mockReturnValue({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await saveState('test-domain');

    expect(result).toEqual({ 
      success: false, 
      error: 'Failed to save state' 
    });
  });

  it('should filter by site_id when domain is provided', async () => {
    const mockTasks = [mockTaskData({ id: 1 })];

    const mockEq = jest.fn().mockReturnValue({
      data: mockTasks,
      error: null,
    });

    // Mock for current tasks with site_id filter
    mockSupabase.mockSelect.mockReturnValue({
      eq: mockEq,
    });

    // Mock for latest snapshot check
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for TaskHistory insert
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    });

    await saveState('test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should work without domain parameter', async () => {
    const mockTasks = [mockTaskData({ id: 1 })];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValue({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for TaskHistory insert
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    });

    const result = await saveState();

    expect(result).toEqual({ success: true });
    expect(getSiteData).not.toHaveBeenCalled();
  });

  it('should create history entries for all tasks', async () => {
    const mockTasks = [
      mockTaskData({ id: 1 }),
      mockTaskData({ id: 2 }),
      mockTaskData({ id: 3 }),
    ];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    };

    mockSupabase.mockInsert.mockReturnValue(mockInsertChain);

    await saveState('test-domain');

    // Should create 3 history entries
    expect(mockSupabase.mockInsert).toHaveBeenCalledTimes(3);
  });

  it('should handle errors during snapshot creation', async () => {
    const mockTasks = [mockTaskData({ id: 1 })];

    // Mock for current tasks
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockTasks,
      error: null,
    });

    // Mock for latest snapshot check
    mockSupabase.mockSelect.mockReturnValueOnce({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock for TaskHistory insert - with error
    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockRejectedValue(new Error('Insert failed')),
      }),
    });

    const result = await saveState('test-domain');

    expect(result).toEqual({ 
      success: false, 
      error: 'Failed to save state' 
    });
  });
});

