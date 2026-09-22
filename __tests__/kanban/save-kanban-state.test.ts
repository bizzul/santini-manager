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


/**
 * Regressione RLS — TaskHistory non ha una colonna site_id.
 *
 * Le sue colonne sono (id, "taskId", snapshot, "createdAt"). Prima della
 * messa in sicurezza RLS questa action filtrava e inseriva site_id su
 * TaskHistory, ma il ramo non veniva mai eseguito perche' KanbanBoard
 * chiamava saveState() senza dominio, quindi siteId restava null.
 *
 * Ora KanbanBoard passa il dominio: senza questa correzione le query su
 * TaskHistory fallirebbero con 42703 "column TaskHistory.site_id does not
 * exist".
 */
describe('Kanban - saveKanbanState - nessun site_id su TaskHistory', () => {
  type Call = { table: string; op: string; args: any[] };

  function trackingClient(results: Record<string, any>) {
    const calls: Call[] = [];
    const builders: Record<string, any> = {};

    const make = (table: string) => {
      const b: any = {};
      for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit']) {
        b[op] = jest.fn((...args: any[]) => {
          calls.push({ table, op, args });
          return b;
        });
      }
      b.single = jest.fn().mockResolvedValue({ data: {}, error: null });
      // thenable: rende il builder awaitable come il query builder di Supabase
      b.then = (resolve: any, reject: any) =>
        Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject);
      return b;
    };

    const client = {
      from: jest.fn((table: string) => {
        builders[table] ||= make(table);
        return builders[table];
      }),
    };

    return { client, calls };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('non filtra TaskHistory per site_id quando il dominio e fornito', async () => {
    const { client, calls } = trackingClient({
      Task: { data: [mockTaskData({ id: 1 })], error: null },
      TaskHistory: { data: [], error: null },
    });
    (createClient as jest.Mock).mockResolvedValue(client);

    const result = await saveState('test-domain');

    expect(result).toEqual({ success: true });

    const eqOnTaskHistory = calls.filter((c) => c.table === 'TaskHistory' && c.op === 'eq');
    expect(eqOnTaskHistory).toHaveLength(0);
  });

  it('filtra invece i Task per site_id quando il dominio e fornito', async () => {
    const { client, calls } = trackingClient({
      Task: { data: [mockTaskData({ id: 1 })], error: null },
      TaskHistory: { data: [], error: null },
    });
    (createClient as jest.Mock).mockResolvedValue(client);

    await saveState('test-domain');

    const eqOnTask = calls.filter((c) => c.table === 'Task' && c.op === 'eq');
    expect(eqOnTask).toHaveLength(1);
    expect(eqOnTask[0].args).toEqual(['site_id', 'test-site-id']);
  });

  it('non inserisce site_id nelle righe TaskHistory', async () => {
    const { client, calls } = trackingClient({
      Task: { data: [mockTaskData({ id: 1 }), mockTaskData({ id: 2 })], error: null },
      TaskHistory: { data: [], error: null },
    });
    (createClient as jest.Mock).mockResolvedValue(client);

    await saveState('test-domain');

    const inserts = calls.filter((c) => c.table === 'TaskHistory' && c.op === 'insert');
    expect(inserts).toHaveLength(2);
    for (const call of inserts) {
      expect(call.args[0]).not.toHaveProperty('site_id');
      expect(call.args[0]).toHaveProperty('taskId');
      expect(call.args[0]).toHaveProperty('snapshot');
    }
  });
});
