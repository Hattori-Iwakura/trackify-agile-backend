function createMockDelegate() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  };
}

export class PrismaClient {
  $connect = jest.fn();
  $disconnect = jest.fn();
  $queryRaw = jest.fn();
  $transaction = jest.fn();

  user = createMockDelegate();
  project = createMockDelegate();
  projectMember = createMockDelegate();
  label = createMockDelegate();
  issue = createMockDelegate();
  issueLabel = createMockDelegate();
  attachment = createMockDelegate();
  sprint = createMockDelegate();
  comment = createMockDelegate();
  notification = createMockDelegate();
}
