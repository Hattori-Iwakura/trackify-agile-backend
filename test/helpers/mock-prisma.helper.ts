import { PrismaService } from '../../src/prisma/prisma.service';

type MockDelegate = {
  [key: string]: jest.Mock;
};

export type MockPrismaService = {
  [K in keyof PrismaService]: PrismaService[K] extends (...args: unknown[]) => unknown
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
  return {
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
}
