import { editItem } from '@/app/sites/[domain]/projects/actions/edit-item.action';
import { createClient } from '@/utils/supabase/server';
import { getUserContext } from '@/lib/auth-utils';
import { getSiteData } from '@/lib/fetchers';
import { validation } from '@/validation/task/create';
import { 
  mockSupabaseClient, 
  mockUserContext, 
  mockSiteData, 
  mockTaskData,
  mockKanbanColumnData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/fetchers');
jest.mock('@/validation/task/create');
jest.mock('next/cache');

describe('Projects - editItem', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getUserContext as jest.Mock).mockResolvedValue(mockUserContext());
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should update a task successfully with valid data', async () => {
    const formData = {
      name: 'Updated Task',
      unique_code: 'TEST-002',
      clientId: 2,
      productId: 2,
      deliveryDate: '2024-02-01',
      sellPrice: 2000,
      other: 'Updated notes',
      kanbanId: 2,
      kanbanColumnId: 2,
    };

    const mockTask = mockTaskData({ 
      ...formData,
      id: 1,
      site_id: 'test-site-id'
    });

    const mockColumn = mockKanbanColumnData({ 
      id: 2, 
      kanbanId: 2 
    });

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for column verification
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
        }),
      }),
    });

    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for update
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    const result = await editItem(formData, 1, 'test-domain');

    expect(result).toBeDefined();
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when validation fails', async () => {
    const formData = {
      name: '',
      // Missing required fields
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: 'Validation error',
    });

    const result = await editItem(formData, 1, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Validazione elemento fallita!',
    });
  });

  it('should return error when task not found', async () => {
    const formData = {
      name: 'Updated Task',
      kanbanId: 2,
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Not found' }
        }),
      }),
    });

    const result = await editItem(formData, 999, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Task non trovato!',
    });
  });

  it('should return error when task belongs to different site', async () => {
    const formData = {
      name: 'Updated Task',
      kanbanId: 2,
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for existing task check - different site_id
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'different-site-id' }, 
          error: null 
        }),
      }),
    });

    const result = await editItem(formData, 1, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Non autorizzato a modificare questo task!',
    });
  });

  it('should return error when column is invalid for kanban', async () => {
    const formData = {
      name: 'Updated Task',
      kanbanId: 2,
      kanbanColumnId: 99, // Invalid column ID
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for column verification - column not found
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Column not found' }
          }),
        }),
      }),
    });

    const result = await editItem(formData, 1, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'La colonna selezionata non è valida per questa kanban!',
    });
  });

  it('should use first column when kanbanColumnId not provided', async () => {
    const formData = {
      name: 'Updated Task',
      kanbanId: 2,
      // kanbanColumnId not provided
    };

    const mockColumn = mockKanbanColumnData({ id: 1, kanbanId: 2 });
    const mockTask = mockTaskData({ ...formData, id: 1, kanbanColumnId: 1 });

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for first column fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
          }),
        }),
      }),
    });

    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for update
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    await editItem(formData, 1, 'test-domain');

    expect(mockSupabase.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        kanbanColumnId: 1, // Should use first column ID
      })
    );
  });

  it('should handle positions array correctly', async () => {
    const formData = {
      name: 'Updated Task',
      kanbanId: 2,
      position1: 'pos1',
      position2: 'pos2',
      position3: 'pos3',
    };

    const mockTask = mockTaskData({ ...formData, id: 1 });

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData,
    });

    // Mock for existing task check
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { site_id: 'test-site-id' }, 
          error: null 
        }),
      }),
    });

    // Mock for update
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    await editItem(formData, 1, 'test-domain');

    expect(mockSupabase.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        positions: ['pos1', 'pos2', 'pos3', '', '', '', '', ''],
      })
    );
  });
});

