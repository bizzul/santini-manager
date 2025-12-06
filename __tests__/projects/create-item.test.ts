import { createItem } from '@/app/sites/[domain]/projects/actions/create-item.action';
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

describe('Projects - createItem', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getUserContext as jest.Mock).mockResolvedValue(mockUserContext());
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should create a task successfully with valid data', async () => {
    const formData = {
      data: {
        name: 'Test Task',
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        deliveryDate: '2024-01-01',
        sellPrice: 1000,
        other: 'Test notes',
        kanbanId: 1,
        position1: 'pos1',
      },
    };

    const mockColumn = mockKanbanColumnData();
    const mockTask = mockTaskData();

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
      }),
    });

    const result = await createItem(formData, 'test-domain');

    expect(result).toBeDefined();
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when kanbanId is missing', async () => {
    const formData = {
      data: {
        name: 'Test Task',
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        deliveryDate: '2024-01-01',
        // kanbanId is missing
      },
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    const result = await createItem(formData, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'È necessario selezionare un kanban!',
    });
  });

  it('should return error when validation fails', async () => {
    const formData = {
      data: {
        name: '',
        // Missing required fields
      },
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: 'Validation error',
    });

    const result = await createItem(formData, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Validazione elemento fallita!',
    });
  });

  it('should return error when no columns found for kanban', async () => {
    const formData = {
      data: {
        name: 'Test Task',
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        kanbanId: 1,
      },
    };

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'No column found' }
          }),
        }),
      }),
    });

    const result = await createItem(formData, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Kanban non valido: nessuna colonna trovata!',
    });
  });

  it('should handle task creation error', async () => {
    const formData = {
      data: {
        name: 'Test Task',
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        kanbanId: 1,
      },
    };

    const mockColumn = mockKanbanColumnData();

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' }
        }),
      }),
    });

    const result = await createItem(formData, 'test-domain');

    expect(result).toEqual({
      error: true,
      message: 'Errore nella creazione del task!',
    });
  });

  it('should include site_id when domain is provided', async () => {
    const formData = {
      data: {
        name: 'Test Task',
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        kanbanId: 1,
      },
    };

    const mockColumn = mockKanbanColumnData();
    const mockTask = mockTaskData();

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
        }),
      }),
    });

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
      }),
    };

    mockSupabase.mockInsert.mockReturnValue(mockInsertChain);

    await createItem(formData, 'test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 'test-site-id',
      })
    );
  });
});

