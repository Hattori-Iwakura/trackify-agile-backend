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
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { LabelsService } from './labels.service';
import { CreateLabelSchema } from './dto/create-label.dto';
import type { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelSchema } from './dto/update-label.dto';
import type { UpdateLabelDto } from './dto/update-label.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@ApiTags('Project Labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @RequireProjectRoles(ProjectRole.MEMBER, ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Create a label for the project' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'color'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 50, example: 'bug' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#FF0000' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Label created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role (VIEWER cannot create labels)' })
  @ApiResponse({ status: 409, description: 'Label name already exists in this project' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(CreateLabelSchema)) dto: CreateLabelDto,
  ) {
    return this.labelsService.create(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List project labels (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of labels' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: PaginationDto,
  ) {
    return this.labelsService.findAll(projectId, pagination);
  }

  @Patch(':labelId')
  @RequireProjectRoles(ProjectRole.MEMBER, ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Update a label' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 50, example: 'feature' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#00FF00' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Label updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  @ApiResponse({ status: 409, description: 'Label name already exists in this project' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body(new ZodValidationPipe(UpdateLabelSchema)) dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(projectId, labelId, dto);
  }

  @Delete(':labelId')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Delete a label (ADMIN+ only)' })
  @ApiResponse({ status: 200, description: 'Label deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    return this.labelsService.delete(projectId, labelId);
  }
}
