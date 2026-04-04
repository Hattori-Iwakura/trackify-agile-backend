import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
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
import { GlobalRoleGuard } from '../common/guards/global-role.guard';
import { RequireGlobalRoles } from '../common/decorators/require-global-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { AdminService } from './admin.service';
import { UpdateUserRoleSchema } from './dto/update-user-role.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { GlobalRole } from '../../generated/prisma/enums';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GlobalRoleGuard)
@RequireGlobalRoles(GlobalRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAllUsers(
    @Query(new ZodValidationPipe(PaginationSchema)) query: PaginationDto,
  ) {
    return this.adminService.findAllUsers(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide statistics' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Change a user global role' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', enum: ['ADMIN', 'USER'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required or self-demotion' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(UpdateUserRoleSchema)) dto: UpdateUserRoleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.updateUserRole(userId, dto, user.id);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user account' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required or self-deletion' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.adminService.deleteUser(userId, user.id);
  }
}
