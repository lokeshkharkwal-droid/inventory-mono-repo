import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** In-app notification endpoints (tenant-scoped via the JWT). */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findAll(tenantId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentTenant() tenantId: string) {
    return this.notificationService.unreadCount(tenantId);
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationService.create(tenantId, dto);
  }

  @Post('read-all')
  markAllRead(@CurrentTenant() tenantId: string) {
    return this.notificationService.markAllRead(tenantId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.notificationService.markRead(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.notificationService.remove(id, tenantId);
  }
}
