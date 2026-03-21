import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { RequireProjectRoles } from '../projects/decorators/require-project-roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SprintsService } from './sprints.service';
import { CreateSprintSchema } from './dto/create-sprint.dto';
import type { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintSchema } from './dto/update-sprint.dto';
import type { UpdateSprintDto } from './dto/update-sprint.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post('sprints')
  @ApiOperation({ summary: 'Create a new sprint' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        goal: { type: 'string', maxLength: 500 },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sprint created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(CreateSprintSchema)) dto: CreateSprintDto,
  ) {
    return this.sprintsService.create(projectId, dto);
  }

  @Get('sprints')
  @ApiOperation({ summary: 'List all sprints for a project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of sprints' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.sprintsService.findAll(projectId);
  }

  @Get('sprints/:sprintId')
  @ApiOperation({ summary: 'Get sprint details with issues' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Sprint details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async findOne(@Param('sprintId', ParseUUIDPipe) sprintId: string) {
    return this.sprintsService.findOne(sprintId);
  }

  @Patch('sprints/:sprintId')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Update sprint details' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        goal: { type: 'string', maxLength: 500 },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sprint updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient project role' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async update(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body(new ZodValidationPipe(UpdateSprintSchema)) dto: UpdateSprintDto,
  ) {
    return this.sprintsService.update(sprintId, dto);
  }

  @Delete('sprints/:sprintId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Delete sprint (PLANNING only)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Sprint deleted' })
  @ApiResponse({ status: 400, description: 'Sprint not in PLANNING status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient project role' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async remove(@Param('sprintId', ParseUUIDPipe) sprintId: string) {
    await this.sprintsService.remove(sprintId);
  }

  @Post('sprints/:sprintId/start')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Start sprint (PLANNING → ACTIVE)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Sprint started' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing dates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient project role' })
  @ApiResponse({ status: 409, description: 'Another sprint is already active' })
  async start(@Param('sprintId', ParseUUIDPipe) sprintId: string) {
    return this.sprintsService.start(sprintId);
  }

  @Post('sprints/:sprintId/complete')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Complete sprint (ACTIVE → COMPLETED)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Sprint completed, incomplete issues moved to backlog' })
  @ApiResponse({ status: 400, description: 'Sprint not in ACTIVE status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient project role' })
  async complete(@Param('sprintId', ParseUUIDPipe) sprintId: string) {
    return this.sprintsService.complete(sprintId);
  }

  @Get('backlog')
  @ApiOperation({ summary: 'Get backlog issues (not assigned to any sprint)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of backlog issues' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async getBacklog(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.sprintsService.getBacklog(projectId);
  }

  @Post('sprints/:sprintId/issues/:issueKey')
  @ApiOperation({ summary: 'Add issue to sprint' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'Issue added to sprint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Sprint or issue not found' })
  async addIssue(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Param('issueKey') issueKey: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.sprintsService.addIssueToSprint(sprintId, issueKey, projectId);
  }

  @Delete('sprints/:sprintId/issues/:issueKey')
  @ApiOperation({ summary: 'Remove issue from sprint' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'sprintId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'Issue removed from sprint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Sprint or issue not found' })
  async removeIssue(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Param('issueKey') issueKey: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.sprintsService.removeIssueFromSprint(sprintId, issueKey, projectId);
  }
}
