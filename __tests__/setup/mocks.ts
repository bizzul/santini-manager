// Mock Supabase Client
export const mockSupabaseClient = () => {
  // Create chainable query builder
  const createChainableBuilder = (): any => {
    const builder: any = {};
    
    builder.select = jest.fn().mockReturnValue(builder);
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.delete = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.neq = jest.fn().mockReturnValue(builder);
    builder.in = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn();
    builder.data = null;
    builder.error = null;
    
    return builder;
  };

  const queryBuilder = createChainableBuilder();
  
  const mockFrom = jest.fn().mockReturnValue(queryBuilder);

  const client = {
    from: mockFrom,
  };

  return {
    client,
    mockFrom,
    mockSelect: queryBuilder.select,
    mockInsert: queryBuilder.insert,
    mockUpdate: queryBuilder.update,
    mockDelete: queryBuilder.delete,
    mockEq: queryBuilder.eq,
    mockNeq: queryBuilder.neq,
    mockIn: queryBuilder.in,
    mockOrder: queryBuilder.order,
    mockLimit: queryBuilder.limit,
    mockSingle: queryBuilder.single,
  };
};

// Mock User Context
export const mockUserContext = (userId: string = 'test-user-id') => ({
  user: {
    id: userId,
    email: 'test@example.com',
  },
});

// Mock Site Data
export const mockSiteData = (siteId: string = 'test-site-id', orgId: string = 'test-org-id') => ({
  data: {
    id: siteId,
    organization_id: orgId,
    subdomain: 'test-site',
    name: 'Test Site',
  },
});

// Mock Task Data
export const mockTaskData = (overrides = {}) => ({
  id: 1,
  name: 'Test Task',
  title: '',
  unique_code: 'TEST-001',
  clientId: 1,
  sellProductId: 1,
  deliveryDate: '2024-01-01',
  sellPrice: 1000,
  other: 'Test notes',
  kanbanId: 1,
  kanbanColumnId: 1,
  site_id: 'test-site-id',
  archived: false,
  positions: ['', '', '', '', '', '', '', ''],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock Kanban Data
export const mockKanbanData = (overrides = {}) => ({
  id: 1,
  title: 'Test Kanban',
  identifier: 'test-kanban',
  color: '#000000',
  category_id: 1,
  site_id: 'test-site-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock Kanban Column Data
export const mockKanbanColumnData = (overrides = {}) => ({
  id: 1,
  title: 'Test Column',
  identifier: 'test-column',
  position: 1,
  icon: 'test-icon',
  kanbanId: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock Kanban Category Data
export const mockKanbanCategoryData = (overrides = {}) => ({
  id: 1,
  name: 'Test Category',
  identifier: 'test-category',
  description: 'Test description',
  icon: 'test-icon',
  color: '#000000',
  display_order: 1,
  site_id: 'test-site-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

