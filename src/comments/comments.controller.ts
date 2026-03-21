import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CommentsService } from './comments.service';
import { CreateCommentSchema } from './dto/create-comment.dto';
import type { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentSchema } from './dto/update-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues/:issueKey/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment on an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 5000 },
        parentId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid parentId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async create(
    @Param('issueKey') issueKey: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateCommentSchema)) dto: CreateCommentDto,
    @Param('projectId', ParseUUIDPipe) projectId?: string,
  ) {
    const issue = await this.commentsService.resolveIssueByKey(projectId!, issueKey);
    return this.commentsService.create(issue.id, user.id, dto, {
      projectId: projectId!,
      issueKey,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List threaded comments for an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'Threaded comment list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async findAll(
    @Param('issueKey') issueKey: string,
    @Param('projectId', ParseUUIDPipe) projectId?: string,
  ) {
    const issue = await this.commentsService.resolveIssueByKey(projectId!, issueKey);
    return this.commentsService.findAllForIssue(issue.id);
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 5000 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the author or admin/owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateCommentSchema)) dto: UpdateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.update(commentId, user.id, dto, req.projectMember?.role);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the author or admin/owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { id: string },
    @Req() req: any,
  ) {
    return this.commentsService.remove(commentId, user.id, req.projectMember?.role);
  }
}
