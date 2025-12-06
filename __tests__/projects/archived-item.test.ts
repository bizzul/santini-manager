import { archiveItem } from '@/app/sites/[domain]/projects/actions/archived-item-action';
import { createClient } from '@/utils/supabase/server';
import { getUserContext } from '@/lib/auth-utils';
import { 
  mockSupabaseClient, 
  mockUserContext, 
  mockTaskData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/auth-utils');
jest.mock('next/cache');

describe('Projects - archiveItem', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getUserContext as jest.Mock).mockResolvedValue(mockUserContext());
  });

  it('should archive a task successfully', async () => {
    const mockTask = mockTaskData({ id: 1, archived: true });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(true, 1);

    expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
      archived: true,
    });
  });

  it('should unarchive a task successfully', async () => {
    const mockTask = mockTaskData({ id: 1, archived: false });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(false, 1);

    expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
      archived: false,
    });
  });

  it('should create action record after archiving', async () => {
    const mockTask = mockTaskData({ id: 1, archived: true });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(true, 1);

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith({
      type: 'task_update',
      data: { task: 1 },
      user_id: 'test-user-id',
    });
  });

  it('should handle errors gracefully', async () => {
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    });

    const result = await archiveItem(true, 1);

    expect(result).toEqual({
      message: 'Creazione elemento fallita!',
      error: 'Database error',
    });
  });

  it('should handle missing user context', async () => {
    (getUserContext as jest.Mock).mockResolvedValue(null);

    const mockTask = mockTaskData({ id: 1, archived: true });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(true, 1);

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith({
      type: 'task_update',
      data: { task: 1 },
      user_id: null,
    });
  });
});

