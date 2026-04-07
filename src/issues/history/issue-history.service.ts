import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HistoryEntry {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

@Injectable()
export class IssueHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async recordChanges(issueId: string, changedById: string, changes: HistoryEntry[]) {
    if (!changes.length) return;
    await this.prisma.issueHistory.createMany({
      data: changes.map((c) => ({
        issueId,
        changedById,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
    });
  }

  async getHistory(issueId: string) {
    return this.prisma.issueHistory.findMany({
      where: { issueId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        changedBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }
}
