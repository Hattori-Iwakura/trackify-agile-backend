import {
  Injectable,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ErrorCode } from '../common/constants/error-codes';
import { UpdateProfileDto } from './dto/update-profile.dto';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly uploadService?: UploadService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(ErrorCode.USER_EMAIL_EXISTS);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SAFE_SELECT,
    });
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const oldUser = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarUrl: true },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: USER_SAFE_SELECT,
    });

    if (oldUser?.avatarUrl && this.uploadService) {
      this.uploadService.deleteFile(oldUser.avatarUrl);
    }

    return updatedUser;
  }
}
