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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IssuesService } from './issues.service';
import { CreateIssueSchema } from './dto/create-issue.dto';
import type { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueSchema } from './dto/update-issue.dto';
import type { UpdateIssueDto } from './dto/update-issue.dto';
import { UpdateIssueStatusSchema } from './dto/update-issue-status.dto';
import type { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { ReorderIssueSchema } from './dto/reorder-issue.dto';
import type { ReorderIssueDto } from './dto/reorder-issue.dto';
import { QueryIssuesSchema } from './dto/query-issues.dto';
import type { QueryIssuesDto } from './dto/query-issues.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
        priority: { type: 'string', enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] },
        type: { type: 'string', enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] },
        assigneeId: { type: 'string', format: 'uuid' },
        labelIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Issue created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or assignee not a project member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateIssueSchema)) dto: CreateIssueDto,
  ) {
    return this.issuesService.create(projectId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List issues with filters and pagination' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Paginated list of issues' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(QueryIssuesSchema)) query: QueryIssuesDto,
  ) {
    return this.issuesService.findAll(projectId, query);
  }

  // IMPORTANT: This route MUST be defined before GET /:issueKey to avoid param collision
  @Get('board')
  @ApiOperation({ summary: 'Get Kanban board data grouped by status' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Board data grouped by IssueStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async getBoard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.issuesService.getBoard(projectId, sprintId);
  }

  @Get(':issueKey')
  @ApiOperation({ summary: 'Get issue details by issue key' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'Issue details with relations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
  ) {
    return this.issuesService.findOne(projectId, issueKey);
  }

  @Patch(':issueKey')
  @ApiOperation({ summary: 'Update issue fields' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
        priority: { type: 'string', enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] },
        type: { type: 'string', enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] },
        assigneeId: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Issue updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(UpdateIssueSchema)) dto: UpdateIssueDto,
  ) {
    return this.issuesService.update(projectId, issueKey, dto);
  }

  @Patch(':issueKey/status')
  @ApiOperation({ summary: 'Update issue status (Kanban column move)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async updateStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(UpdateIssueStatusSchema)) dto: UpdateIssueStatusDto,
  ) {
    return this.issuesService.updateStatus(projectId, issueKey, dto.status);
  }

  @Patch(':issueKey/reorder')
  @ApiOperation({ summary: 'Reorder issue (drag-and-drop)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status', 'position'],
      properties: {
        status: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] },
        position: { type: 'integer', minimum: 0 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Issue reordered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(ReorderIssueSchema)) dto: ReorderIssueDto,
  ) {
    return this.issuesService.reorder(projectId, issueKey, dto);
  }

  @Post(':issueKey/labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a label to an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'labelId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Label added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue or label not found' })
  async addLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    await this.issuesService.addLabel(projectId, issueKey, labelId);
  }

  @Delete(':issueKey/labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a label from an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'labelId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Label removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue or label not found' })
  async removeLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    await this.issuesService.removeLabel(projectId, issueKey, labelId);
  }

  @Delete(':issueKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Delete an issue (ADMIN/OWNER only)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 204, description: 'Issue deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient project role' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
  ) {
    await this.issuesService.remove(projectId, issueKey);
  }
}
