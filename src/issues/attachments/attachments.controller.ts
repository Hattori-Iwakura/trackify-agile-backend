import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../projects/guards/project-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createMulterOptions } from '../../upload/multer.config';
import { AttachmentsService } from './attachments.service';

const ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
];

@ApiTags('Issue Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues/:issueKey/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file attachment to an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size exceeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  @UseInterceptors(
    FileInterceptor('file', createMulterOptions('attachments', ATTACHMENT_MIME_TYPES)),
  )
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.attachmentsService.upload(projectId, issueKey, user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all attachments for an issue' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('issueKey') issueKey: string,
  ) {
    return this.attachmentsService.findAllForIssue(projectId, issueKey);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment (uploader or ADMIN/OWNER)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'issueKey', type: 'string', example: 'TRK-42' })
  @ApiParam({ name: 'attachmentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not uploader and not ADMIN/OWNER' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async remove(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { id: string },
    @Req() req: any,
  ) {
    const memberRole = req.projectMember?.role;
    if (!memberRole) {
      throw new ForbiddenException('Project membership context missing');
    }
    await this.attachmentsService.remove(attachmentId, user.id, memberRole);
  }
}
