import {
  Controller,
  Get,
  Post,
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
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../projects/guards/project-role.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { IssueLinksService } from './issue-links.service';
import { IssuesService } from '../issues.service';
import { CreateIssueLinkSchema } from './dto/create-issue-link.dto';
import type { CreateIssueLinkDto } from './dto/create-issue-link.dto';

@ApiTags('Issue Links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues/:issueKey/links')
export class IssueLinksController {
  constructor(
    private readonly issueLinksService: IssueLinksService,
    private readonly issuesService: IssuesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all links for an issue (both directions)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: '{ linksFrom: [], linksTo: [] }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
  ) {
    const issue = await this.issuesService.findOne(projectId, issueKey);
    return this.issueLinksService.findAll(issue.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a link between two issues' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['targetIssueKey', 'linkType'],
      properties: {
        targetIssueKey: { type: 'string', example: 'TRK-7' },
        linkType: {
          type: 'string',
          enum: ['BLOCKS', 'IS_BLOCKED_BY', 'RELATES_TO', 'DUPLICATES', 'IS_DUPLICATED_BY'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Link created' })
  @ApiResponse({ status: 400, description: 'Duplicate link or self-link' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Source or target issue not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(CreateIssueLinkSchema)) dto: CreateIssueLinkDto,
  ) {
    const issue = await this.issuesService.findOne(projectId, issueKey);
    return this.issueLinksService.create(issue.id, dto);
  }

  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a link' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'linkId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Link removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    const issue = await this.issuesService.findOne(projectId, issueKey);
    await this.issueLinksService.remove(linkId, issue.id);
  }
}
