import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../projects/guards/project-role.guard';
import { IssueHistoryService } from './issue-history.service';
import { IssuesService } from '../issues.service';

@ApiTags('Issue History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues/:issueKey/history')
export class IssueHistoryController {
  constructor(
    private readonly issueHistoryService: IssueHistoryService,
    private readonly issuesService: IssuesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get field-change history for an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'List of history entries (newest first, max 50)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async getHistory(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
  ) {
    const issue = await this.issuesService.findOne(projectId, issueKey);
    return this.issueHistoryService.getHistory(issue.id);
  }
}
