import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminPaginationQueryDto } from './dto/admin-pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GlobalRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Get('networks')
  listNetworks(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listNetworks(query);
  }

  @Get('groups')
  listGroups(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listGroups(query);
  }

  @Get('channels')
  listChannels(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listChannels(query);
  }
}
