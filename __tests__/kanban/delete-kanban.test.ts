import { deleteKanban } from '@/app/sites/[domain]/kanban/actions/delete-kanban.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData, 
  mockKanbanData,
  mockKanbanColumnData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');

describe('Kanban - deleteKanban', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should delete a kanban successfully', async () => {
    const mockKanban = mockKanbanData({ id: 1 });
    const mockColumns = [
      mockKanbanColumnData({ id: 1, kanbanId: 1 }),
      mockKanbanColumnData({ id: 2, kanbanId: 1 }),
    ];

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks from kanban
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      }),
    });

    // Mock for columns fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ data: mockColumns, error: null }),
    });

    // Mock for disconnecting tasks from columns
    mockSupabase.mockUpdate.mockReturnValueOnce({
      in: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null }),
      }),
    });

    // Mock for deleting columns
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for deleting kanban
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result).toEqual({
      success: true,
      tasksDisconnected: 3, // 1 from kanban + 2 from columns
    });
    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should return error when kanban not found', async () => {
    // Mock for kanban fetch - not found
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Not found' }
        }),
      }),
    });

    const result = await deleteKanban(999, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Kanban non trovato o non hai i permessi per eliminarlo',
    });
  });

  it('should return error when kanban belongs to different site', async () => {
    const mockKanban = mockKanbanData({ 
      id: 1, 
      site_id: 'different-site-id' 
    });

    // Mock for kanban fetch - different site
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    const result = await deleteKanban(1, 'test-domain');

    // This will fail because the query includes eq("site_id", siteId)
    // so it won't find the kanban
    expect(result).toEqual({
      success: false,
      error: 'Kanban non trovato o non hai i permessi per eliminarlo',
    });
  });

  it('should disconnect tasks from kanban before deletion', async () => {
    const mockKanban = mockKanbanData({ id: 1 });

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks from kanban
    const mockUpdateKanban = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ 
        data: [{ id: 1 }, { id: 2 }, { id: 3 }], 
        error: null 
      }),
    });
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: mockUpdateKanban,
    });

    // Mock for columns fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    // Mock for deleting columns
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for deleting kanban
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result.success).toBe(true);
    expect(result.tasksDisconnected).toBe(3);
  });

  it('should disconnect tasks from columns before deletion', async () => {
    const mockKanban = mockKanbanData({ id: 1 });
    const mockColumns = [
      mockKanbanColumnData({ id: 1, kanbanId: 1 }),
      mockKanbanColumnData({ id: 2, kanbanId: 1 }),
    ];

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks from kanban
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock for columns fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ data: mockColumns, error: null }),
    });

    // Mock for disconnecting tasks from columns
    const mockUpdateColumns = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ 
        data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], 
        error: null 
      }),
    });
    mockSupabase.mockUpdate.mockReturnValueOnce({
      in: mockUpdateColumns,
    });

    // Mock for deleting columns
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    // Mock for deleting kanban
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result.success).toBe(true);
    expect(result.tasksDisconnected).toBe(4);
  });

  it('should delete all columns associated with kanban', async () => {
    const mockKanban = mockKanbanData({ id: 1 });
    const mockColumns = [
      mockKanbanColumnData({ id: 1, kanbanId: 1 }),
      mockKanbanColumnData({ id: 2, kanbanId: 1 }),
      mockKanbanColumnData({ id: 3, kanbanId: 1 }),
    ];

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks from kanban
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock for columns fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ data: mockColumns, error: null }),
    });

    // Mock for disconnecting tasks from columns
    mockSupabase.mockUpdate.mockReturnValueOnce({
      in: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock for deleting columns
    const mockDeleteColumns = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: mockDeleteColumns,
    });

    // Mock for deleting kanban
    mockSupabase.mockDelete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result.success).toBe(true);
  });

  it('should handle errors during deletion', async () => {
    const mockKanban = mockKanbanData({ id: 1 });

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks - with error
    mockSupabase.mockUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' }
        }),
      }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: 'Errore durante lo scollegamento delle task dal kanban',
    });
  });

  it('should handle errors when deleting columns', async () => {
    const mockKanban = mockKanbanData({ id: 1 });
    const mockColumns = [mockKanbanColumnData({ id: 1 })];

    // Mock for kanban fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockKanban, error: null }),
      }),
    });

    // Mock for disconnecting tasks from kanban
    mockSupabase.mockUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock for columns fetch
    mockSupabase.mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({ data: mockColumns, error: null }),
    });

    // Mock for disconnecting tasks from columns
    mockSupabase.mockUpdate.mockReturnValueOnce({
      in: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock for deleting columns - with error
    mockSupabase.mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ 
        error: { message: 'Cannot delete columns' }
      }),
    });

    const result = await deleteKanban(1, 'test-domain');

    expect(result).toEqual({
      success: false,
      error: "Errore durante l'eliminazione delle colonne del kanban",
    });
  });
});

