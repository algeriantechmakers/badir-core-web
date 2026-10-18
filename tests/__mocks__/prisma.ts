import { vi } from "vitest";

const model = () => ({
  count: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  groupBy: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  upsert: vi.fn(),
});

export const prismaMock = {
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (callback: (tx: typeof prismaMock) => unknown) =>
    callback(prismaMock),
  ),
  account: model(),
  initiative: model(),
  initiativeParticipant: model(),
  initiativePost: model(),
  organization: model(),
  postEmailQueue: model(),
  session: model(),
  user: model(),
  userInitiativeRating: model(),
  userQualification: model(),
};
