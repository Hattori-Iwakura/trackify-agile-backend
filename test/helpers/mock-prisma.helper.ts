import { PrismaService } from '../../src/prisma/prisma.service';

type MockDelegate = {
  [key: string]: jest.Mock;
};

export type MockPrismaService = {
  [K in keyof PrismaService]: PrismaService[K] extends (
    ...args: unknown[]
  ) => unknown
    ? jest.Mock
    : PrismaService[K] extends object
      ? MockDelegate
      : PrismaService[K];
};

function createMockDelegate(): MockDelegate {
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

export function createMockPrismaService() {
  const mock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),

    user: createMockDelegate(),
    project: createMockDelegate(),
    projectMember: createMockDelegate(),
    label: createMockDelegate(),
    issue: createMockDelegate(),
    issueLabel: createMockDelegate(),
    attachment: createMockDelegate(),
    sprint: createMockDelegate(),
    comment: createMockDelegate(),
    notification: createMockDelegate(),
  };

  // Support interactive transactions: $transaction(async (tx) => { ... })
  // eslint-disable-next-line @typescript-eslint/require-await
  mock.$transaction.mockImplementation(async (cbOrArray: unknown) => {
    if (typeof cbOrArray === 'function') {
      return (cbOrArray as (tx: typeof mock) => unknown)(mock);
    }
    return cbOrArray;
  });

  return mock;
}
