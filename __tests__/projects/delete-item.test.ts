import { removeItem } from '@/app/sites/[domain]/projects/actions/delete-item.action';
import { createClient } from '@/utils/supabase/server';
import { getUserContext } from '@/lib/auth-utils';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockUserContext, 
  mockSiteData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/fetchers');
jest.mock('next/cache');

describe('Projects - removeItem', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getUserContext as jest.Mock).mockResolvedValue(mockUserContext());
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should delete a task successfully', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for QualityControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for PackingControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for delete operation
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    const result = await removeItem(1, 'test-domain');

    expect(result).toBeDefined();
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when task not found', async () => {
    // Mock for existing task check - task not found
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Not found' }
        }),
      }),
    });

    const result = await removeItem(999, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Task non trovato!',
    });
  });

  it('should return error when task belongs to different site', async () => {
    // Mock for existing task check - different site_id
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'different-site-id' }, 
          error: null 
        }),
      }),
    });

    const result = await removeItem(1, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Non autorizzato a cancellare task di altri siti!',
    });
  });

  it('should delete related TaskHistory records', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check - has records
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [{ id: 1 }, { id: 2 }], 
        error: null 
      }),
    });

    // Mock for TaskHistory delete
    const mockTaskHistoryDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    
    mockSupabase.mockDelete.mockReturnValueOnce(mockTaskHistoryDelete());

    // Mock for QualityControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for PackingControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for main task delete
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await removeItem(1, 'test-domain');

    expect(mockTaskHistoryDelete).toHaveBeenCalled();
  });

  it('should delete related QualityControl records', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for QualityControl check - has records
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [{ id: 1 }], 
        error: null 
      }),
    });

    // Mock for QualityControl delete
    const mockQCDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    
    mockSupabase.mockDelete.mockReturnValueOnce(mockQCDelete());

    // Mock for PackingControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for main task delete
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await removeItem(1, 'test-domain');

    expect(mockQCDelete).toHaveBeenCalled();
  });

  it('should delete related PackingControl records', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for QualityControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for PackingControl check - has records
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [{ id: 1 }], 
        error: null 
      }),
    });

    // Mock for PackingControl delete
    const mockBoxingDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    
    mockSupabase.mockDelete.mockReturnValueOnce(mockBoxingDelete());

    // Mock for main task delete
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await removeItem(1, 'test-domain');

    expect(mockBoxingDelete).toHaveBeenCalled();
  });

  it('should handle deletion error', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for QualityControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for PackingControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for delete operation - with error
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ 
        error: { message: 'Database error' }
      }),
    });

    const result = await removeItem(1, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Errore nella cancellazione del task!',
    });
  });

  it('should create action record after successful deletion', async () => {
    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for TaskHistory check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for QualityControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for PackingControl check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
    });

    // Mock for delete operation
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await removeItem(1, 'test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_delete',
        data: { task: 1 },
        user_id: 'test-user-id',
        site_id: 'test-site-id',
        organization_id: 'test-org-id',
      })
    );
  });
});

