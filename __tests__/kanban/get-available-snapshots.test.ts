import { getAvailableSnapshots } from '@/app/sites/[domain]/kanban/actions/get-available-snapshots.action';
import { createClient } from '@/utils/supabase/server';
import { getSiteData } from '@/lib/fetchers';
import { 
  mockSupabaseClient, 
  mockSiteData 
} from '../setup/mocks';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/fetchers');

describe('Kanban - getAvailableSnapshots', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = mockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase.client);
    (getSiteData as jest.Mock).mockResolvedValue(mockSiteData());
  });

  it('should fetch and group snapshots successfully', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
      { createdAt: '2024-01-01T10:30:30Z' }, // Same minute
      { createdAt: '2024-01-01T10:31:00Z' }, // Different minute
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: mockTaskHistories,
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should be grouped by minute
    expect(result.length).toBeLessThanOrEqual(mockTaskHistories.length);
  });

  it('should return empty array when no histories found', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    expect(result).toEqual([]);
  });

  it('should group by minute correctly', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
      { createdAt: '2024-01-01T10:30:15Z' },
      { createdAt: '2024-01-01T10:30:45Z' },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: mockTaskHistories,
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    // All three should be grouped into one snapshot (same minute)
    expect(result.length).toBe(1);
    expect(result[0].taskCount).toBe(3);
  });

  it('should limit to 50 most recent snapshots', async () => {
    // Create 100 task histories with different minutes
    const mockTaskHistories = Array.from({ length: 100 }, (_, i) => ({
      createdAt: new Date(2024, 0, 1, 10, i, 0).toISOString(),
    }));

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: mockTaskHistories,
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('should order snapshots by timestamp descending', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
      { createdAt: '2024-01-01T10:31:00Z' },
      { createdAt: '2024-01-01T10:29:00Z' },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: mockTaskHistories,
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    // Should be ordered with most recent first
    if (result.length > 1) {
      const firstTimestamp = new Date(result[0].timestamp).getTime();
      const secondTimestamp = new Date(result[1].timestamp).getTime();
      expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
    }
  });

  it('should filter by site_id when domain is provided', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
    ];

    const mockEq = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: mockTaskHistories,
          error: null,
        }),
      }),
    });

    mockSupabase.mockSelect.mockReturnValue({
      eq: mockEq,
    });

    await getAvailableSnapshots('test-domain');

    expect(getSiteData).toHaveBeenCalledWith('test-domain');
  });

  it('should throw error when database query fails', async () => {
    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    });

    await expect(getAvailableSnapshots('test-domain')).rejects.toThrow(
      'Failed to get available snapshots'
    );
  });

  it('should work without domain parameter', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          data: mockTaskHistories,
          error: null,
        }),
      }),
    });

    const result = await getAvailableSnapshots();

    expect(result).toBeDefined();
    expect(getSiteData).not.toHaveBeenCalled();
  });

  it('should include task count in snapshot', async () => {
    const mockTaskHistories = [
      { createdAt: '2024-01-01T10:30:00Z' },
      { createdAt: '2024-01-01T10:30:30Z' },
    ];

    mockSupabase.mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: mockTaskHistories,
            error: null,
          }),
        }),
      }),
    });

    const result = await getAvailableSnapshots('test-domain');

    expect(result[0]).toHaveProperty('taskCount');
    expect(result[0].taskCount).toBe(2);
  });
});

