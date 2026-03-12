import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.toProfile(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const data: any = {};

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email is already in use');
      }
      data.email = email;
    }
    if (typeof dto.name !== 'undefined') data.name = dto.name;
    if (typeof dto.avatar !== 'undefined') data.avatar = dto.avatar;
    if (typeof dto.bio !== 'undefined') data.bio = dto.bio;
    if (typeof dto.mobile !== 'undefined') data.mobile = dto.mobile;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toProfile(updated);
  }

  private toProfile(user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    mobile: string | null;
    globalRole: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      mobile: user.mobile,
      globalRole: user.globalRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

