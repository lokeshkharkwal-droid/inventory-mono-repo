import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AlertsService } from './alerts.service';
import { TenantRegistryService } from './tenant-registry.service';

/**
 * Scheduled stock-alert cron + the platform-level tenant registry it enumerates.
 * Exports {@link TenantRegistryService} so feature modules can register a tenant
 * as it becomes active (see SettingsModule / ProductModule).
 */
@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [AlertsService, TenantRegistryService],
  exports: [TenantRegistryService, AlertsService],
})
export class AlertsModule {}
