import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import type { CreateLabelDto } from './dto/create-label.dto';
import type { UpdateLabelDto } from './dto/update-label.dto';
import type { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateLabelDto) {
    try {
      return await this.prisma.label.create({
        data: {
          name: dto.name,
          color: dto.color,
          projectId,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException({
          message: `Label '${dto.name}' already exists in this project`,
          errorCode: ErrorCode.PROJECT_LABEL_EXISTS,
        });
      }
      throw error;
    }
  }

  async findAll(
    projectId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.label.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.label.count({ where }),
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

  async update(projectId: string, labelId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundException({
        message: 'Label not found',
        errorCode: ErrorCode.PROJECT_LABEL_NOT_FOUND,
      });
    }

    try {
      return await this.prisma.label.update({
        where: { id: labelId },
        data: dto,
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException({
          message: `Label '${dto.name}' already exists in this project`,
          errorCode: ErrorCode.PROJECT_LABEL_EXISTS,
        });
      }
      throw error;
    }
  }

  async delete(projectId: string, labelId: string) {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundException({
        message: 'Label not found',
        errorCode: ErrorCode.PROJECT_LABEL_NOT_FOUND,
      });
    }

    return this.prisma.label.delete({
      where: { id: labelId },
    });
  }
}
