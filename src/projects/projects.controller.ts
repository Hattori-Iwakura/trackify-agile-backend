import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { RequireProjectRoles } from './decorators/require-project-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { ProjectsService } from './projects.service';
import { CreateProjectSchema } from './dto/create-project.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectSchema } from './dto/update-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'key'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100, example: 'My Project' },
        key: { type: 'string', minLength: 2, maxLength: 10, example: 'MYPROJ', description: 'Uppercase letters and numbers, starts with a letter' },
        description: { type: 'string', maxLength: 500, example: 'Project description' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Project key already exists' })
  async create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateProjectSchema)) dto: CreateProjectDto,
  ) {
    return this.projectsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List current user projects (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of projects' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: PaginationDto,
  ) {
    return this.projectsService.findAll(user.id, pagination);
  }

  @Get(':projectId')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, description: 'Project details with member and label counts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectsService.findOne(projectId);
  }

  @Patch(':projectId')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @RequireProjectRoles(ProjectRole.OWNER)
  @ApiOperation({ summary: 'Update project (OWNER only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100, example: 'Updated Name' },
        description: { type: 'string', maxLength: 500, example: 'Updated description' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can update' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(UpdateProjectSchema)) dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(projectId, dto);
  }

  @Delete(':projectId')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @RequireProjectRoles(ProjectRole.OWNER)
  @ApiOperation({ summary: 'Delete project (OWNER only)' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only OWNER can delete' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectsService.delete(projectId);
  }
}
