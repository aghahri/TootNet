import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GlobalRole } from '@prisma/client';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    globalRole: GlobalRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        mobile: dto.mobile ?? null,
        bio: dto.bio ?? null,
      },
    });

    const tokens = await this.issueTokenPair(user.id, user.email);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokenPair(user.id, user.email);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const [tokenId, rawToken] = refreshToken.split('.');
    if (!tokenId || !rawToken) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const matches = await bcrypt.compare(rawToken, stored.hashedToken);
    if (!matches) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokenPair(stored.user.id, stored.user.email);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken
      .deleteMany({ where: { token: refreshToken } })
      .catch(() => {});
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  private async issueTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '15m');
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');

    const accessToken = this.jwt.sign(
      { sub: userId, email, type: 'access' },
      { expiresIn: accessExpires },
    );

    const rawRefreshToken = randomBytes(40).toString('hex');
    const hashedToken = await bcrypt.hash(rawRefreshToken, SALT_ROUNDS);
    const expiresAt = new Date();
    const days = refreshExpires.endsWith('d') ? parseInt(refreshExpires, 10) : 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    const created = await this.prisma.refreshToken.create({
      data: {
        hashedToken,
        userId,
        expiresAt,
      },
    });
    const expiresInSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    const tokenValue = `${created.id}.${rawRefreshToken}`;

    return {
      accessToken,
      refreshToken: tokenValue,
      expiresIn: expiresInSeconds,
    };
  }

  private sanitizeUser(user: { id: string; email: string; name: string; avatar: string | null; globalRole: GlobalRole }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      globalRole: user.globalRole,
    };
  }
}
