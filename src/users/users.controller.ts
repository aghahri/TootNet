import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return this.users.getMe(userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(userId, dto);
  }
}

