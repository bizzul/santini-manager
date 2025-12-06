import { archiveItem } from '@/app/sites/[domain]/kanban/actions/archived-item-action';
import { createClient } from '@/utils/supabase/server';
import { getUserContext } from '@/lib/auth-utils';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockUserContext, 
  mockSiteData, 
  mockTaskData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/fetchers');
jest.mock('next/cache');

describe('Kanban - archiveItem', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getUserContext as jest.Mock).mockResolvedValue(mockUserContext());
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
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

    const result = await archiveItem(true, 1, 'test-domain');

    expect(result).toBeDefined();
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
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

    const result = await archiveItem(false, 1, 'test-domain');

    expect(result).toBeDefined();
    expect(mockSupabase.mockUpdate).toHaveBeenCalledWith({
      archived: false,
    });
  });

  it('should filter by site_id when domain is provided', async () => {
    const mockTask = mockTaskData({ id: 1, archived: true });

    const mockEq = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
      }),
    });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(true, 1, 'test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should create action record with site and organization info', async () => {
    const mockTask = mockTaskData({ id: 1, archived: true });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await archiveItem(true, 1, 'test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith({
      type: 'task_update',
      data: { task: 1 },
      user_id: 'test-user-id',
      site_id: 'test-site-id',
      organization_id: 'test-org-id',
    });
  });

  it('should handle update errors gracefully', async () => {
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database error' }
          }),
        }),
      }),
    });

    const result = await archiveItem(true, 1, 'test-domain');

    expect(result).toEqual({
      message: 'Archivazione elemento fallita!',
      error: 'Failed to archive task',
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

    const result = await archiveItem(true, 1, 'test-domain');

    expect(result).toBeDefined();
    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
      })
    );
  });

  it('should work without domain parameter', async () => {
    const mockTask = mockTaskData({ id: 1, archived: true });

    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    const result = await archiveItem(true, 1);

    expect(result).toBeDefined();
    expect(getSiteData).not.toHaveBeenCalled();
  });
});

