import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import type { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: dto.name,
            key: dto.key,
            description: dto.description,
          },
        });

        const member = await tx.projectMember.create({
          data: {
            userId,
            projectId: project.id,
            role: ProjectRole.OWNER,
          },
        });

        return { ...project, members: [member] };
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException({
          message: `Project key '${dto.key}' already exists`,
          errorCode: ErrorCode.PROJECT_KEY_EXISTS,
        });
      }
      throw error;
    }
  }

  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { members: { some: { userId } } };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.project.count({ where }),
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

  async findOne(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { members: true, labels: true } },
      },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Project not found',
        errorCode: ErrorCode.PROJECT_NOT_FOUND,
      });
    }

    return project;
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Project not found',
        errorCode: ErrorCode.PROJECT_NOT_FOUND,
      });
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async delete(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Project not found',
        errorCode: ErrorCode.PROJECT_NOT_FOUND,
      });
    }

    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }
}
