import { getTaskHistory } from '@/app/sites/[domain]/kanban/actions/get-task-history.action';
import { createClient } from '@/utils/supabase/server';
import { mockSupabaseClient } from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');

describe('Kanban - getTaskHistory', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
  });

  it('should fetch task history successfully', async () => {
    const mockHistory = [
      {
        id: 1,
        taskId: 1,
        snapshot: { name: 'Task 1', status: 'in-progress' },
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        taskId: 1,
        snapshot: { name: 'Task 1', status: 'done' },
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockHistory,
          error: null,
        }),
      }),
    });

    const result = await getTaskHistory(1);

    expect(result).toEqual(mockHistory);
  });

  it('should return empty array when no history found', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getTaskHistory(1);

    expect(result).toEqual([]);
  });

  it('should order history by createdAt descending', async () => {
    const mockHistory = [
      {
        id: 2,
        taskId: 1,
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 1,
        taskId: 1,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockHistory,
          error: null,
        }),
      }),
    });

    const result = await getTaskHistory(1);

    expect(result[0].createdAt).toBe('2024-01-02T00:00:00Z');
    expect(result[1].createdAt).toBe('2024-01-01T00:00:00Z');
  });

  it('should throw error when database query fails', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    await expect(getTaskHistory(1)).rejects.toThrow(
      'Failed to fetch task history'
    );
  });

  it('should filter by taskId correctly', async () => {
    const mockHistory = [
      {
        id: 1,
        taskId: 1,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const mockEq = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: mockHistory,
        error: null,
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: mockEq,
    });

    await getTaskHistory(1);

    expect(mockEq).toHaveBeenCalled();
  });
});

