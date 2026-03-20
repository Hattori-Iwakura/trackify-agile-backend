import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import { NotificationType } from '../../generated/prisma/enums';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type as NotificationType,
        title: dto.title ?? '',
        message: dto.message,
        userId: dto.userId,
        data: dto.data,
      },
    });
  }

  async findAllForUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException({
        message: 'Notification not found',
        errorCode: ErrorCode.NOTIFICATION_NOT_FOUND,
      });
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true } as any,
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false } as any,
      data: { read: true } as any,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false } as any,
    });
  }
}
