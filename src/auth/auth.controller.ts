import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';
import { RegisterSchema } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { LoginSchema } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenSchema } from './dto/refresh-token.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 5 },
  })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'fullName'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: {
          type: 'string',
          minLength: 8,
          example: 'Password1!',
          description:
            'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char',
        },
        fullName: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          example: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 5 },
  })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', example: 'Password1!' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful, returns tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: { id: string; email: string; role: string },
  ) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }
}
