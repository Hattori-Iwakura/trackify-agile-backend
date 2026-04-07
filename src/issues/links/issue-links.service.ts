import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../common/constants/error-codes';
import type { CreateIssueLinkDto } from './dto/create-issue-link.dto';
import type { IssueLinkType } from '../../../generated/prisma/enums';

const ISSUE_SELECT = {
  id: true,
  issueKey: true,
  title: true,
  status: true,
  priority: true,
  type: true,
};

@Injectable()
export class IssueLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(issueId: string) {
    const [linksFrom, linksTo] = await Promise.all([
      this.prisma.issueLink.findMany({
        where: { sourceIssueId: issueId },
        orderBy: { createdAt: 'desc' },
        include: { targetIssue: { select: ISSUE_SELECT } },
      }),
      this.prisma.issueLink.findMany({
        where: { targetIssueId: issueId },
        orderBy: { createdAt: 'desc' },
        include: { sourceIssue: { select: ISSUE_SELECT } },
      }),
    ]);
    return { linksFrom, linksTo };
  }

  async create(sourceIssueId: string, dto: CreateIssueLinkDto) {
    const targetIssue = await this.prisma.issue.findUnique({
      where: { issueKey: dto.targetIssueKey },
      select: { id: true },
    });

    if (!targetIssue) {
      throw new NotFoundException({
        message: `Issue '${dto.targetIssueKey}' not found`,
        errorCode: ErrorCode.ISSUE_KEY_NOT_FOUND,
      });
    }

    if (targetIssue.id === sourceIssueId) {
      throw new BadRequestException({
        message: 'An issue cannot link to itself',
        errorCode: ErrorCode.ISSUE_LINK_SELF,
      });
    }

    try {
      return await this.prisma.issueLink.create({
        data: {
          sourceIssueId,
          targetIssueId: targetIssue.id,
          linkType: dto.linkType as IssueLinkType,
        },
        include: {
          targetIssue: { select: ISSUE_SELECT },
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException({
          message: 'This link already exists',
          errorCode: ErrorCode.ISSUE_LINK_DUPLICATE,
        });
      }
      throw error;
    }
  }

  async remove(linkId: string, issueId: string) {
    const link = await this.prisma.issueLink.findFirst({
      where: {
        id: linkId,
        OR: [{ sourceIssueId: issueId }, { targetIssueId: issueId }],
      },
    });

    if (!link) {
      throw new NotFoundException({
        message: 'Link not found',
        errorCode: ErrorCode.ISSUE_LINK_NOT_FOUND,
      });
    }

    await this.prisma.issueLink.delete({ where: { id: linkId } });
  }
}
