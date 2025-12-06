import { createItem } from '@/app/sites/[domain]/kanban/actions/create-item.action';
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

describe('Kanban - createItem', () => {
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

    mockSupabase.mockSelect.mockReturnValueOnce({
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

    // Mock for suppliers
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [{ id: 1, name: 'Supplier 1' }],
      error: null,
    });

    // Mock for TaskSupplier insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    const result = await createItem(formData, 'test-domain');

    expect(result).toEqual(mockTask);
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when validation fails', async () => {
    const formData = {
      data: {
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

  it('should throw error when no columns found for kanban', async () => {
    const formData = {
      data: {
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
      message: 'Creazione elemento fallita!',
      error: 'Kanban non valido: nessuna colonna trovata!',
    });
  });

  it('should handle task creation error', async () => {
    const formData = {
      data: {
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
      message: 'Creazione elemento fallita!',
      error: 'Failed to create task',
    });
  });

  it('should create TaskSupplier relations for default suppliers', async () => {
    const formData = {
      data: {
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        kanbanId: 1,
      },
    };

    const mockColumn = mockKanbanColumnData();
    const mockTask = mockTaskData();
    const mockSuppliers = [
      { id: 1, name: 'Supplier 1' },
      { id: 2, name: 'Supplier 2' },
    ];

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockColumn, error: null }),
        }),
      }),
    });

    mockSupabase.mockInsert.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
      }),
    });

    // Mock for suppliers select
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: mockSuppliers,
      error: null,
    });

    // Mock for TaskSupplier insert
    const mockTaskSupplierInsert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.mockInsert.mockReturnValueOnce(mockTaskSupplierInsert());

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await createItem(formData, 'test-domain');

    expect(mockTaskSupplierInsert).toHaveBeenCalled();
  });

  it('should include site_id when domain is provided', async () => {
    const formData = {
      data: {
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

    mockSupabase.mockSelect.mockReturnValueOnce({
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

    // Mock for suppliers
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [],
      error: null,
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await createItem(formData, 'test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 'test-site-id',
      })
    );
  });

  it('should handle positions array correctly', async () => {
    const formData = {
      data: {
        unique_code: 'TEST-001',
        clientId: 1,
        productId: 1,
        kanbanId: 1,
        position1: 'pos1',
        position2: 'pos2',
        position3: 'pos3',
      },
    };

    const mockColumn = mockKanbanColumnData();
    const mockTask = mockTaskData();

    (validation.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: formData.data,
    });

    mockSupabase.mockSelect.mockReturnValueOnce({
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

    // Mock for suppliers
    mockSupabase.mockSelect.mockReturnValueOnce({
      data: [],
      error: null,
    });

    // Mock for Action insert
    mockSupabase.mockInsert.mockResolvedValue({ error: null });

    await createItem(formData, 'test-domain');

    expect(mockSupabase.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        positions: ['pos1', 'pos2', 'pos3', '', '', '', '', ''],
      })
    );
  });
});

