import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { RequireProjectRoles } from './decorators/require-project-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { MembersService } from './members.service';
import { AddMemberSchema } from './dto/add-member.dto';
import type { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleSchema } from './dto/update-member-role.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ProjectRole } from '../../generated/prisma/enums';

@ApiTags('Project Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Add a member to the project' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
        role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(AddMemberSchema)) dto: AddMemberDto,
    @Req() req: any,
  ) {
    return this.membersService.addMember(projectId, dto, req.projectMember.role);
  }

  @Get()
  @ApiOperation({ summary: 'List project members (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: PaginationDto,
  ) {
    return this.membersService.findAll(projectId, pagination);
  }

  @Patch(':userId')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Update member role' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 409, description: 'Cannot demote the last OWNER' })
  async updateRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema)) dto: UpdateMemberRoleDto,
    @Req() req: any,
  ) {
    return this.membersService.updateRole(projectId, userId, dto, req.projectMember.role);
  }

  // IMPORTANT: /me MUST be declared before /:userId to prevent NestJS capturing "me" as a userId
  @Delete('me')
  @ApiOperation({ summary: 'Leave the project' })
  @ApiResponse({ status: 200, description: 'Left the project' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  @ApiResponse({ status: 409, description: 'Cannot leave as the last OWNER' })
  async leave(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.membersService.leave(projectId, user.id);
  }

  @Delete(':userId')
  @RequireProjectRoles(ProjectRole.ADMIN, ProjectRole.OWNER)
  @ApiOperation({ summary: 'Remove a member from the project' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 409, description: 'Cannot remove the last OWNER' })
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: any,
  ) {
    return this.membersService.removeMember(projectId, userId, req.projectMember.role);
  }
}
