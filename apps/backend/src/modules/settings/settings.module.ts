import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { NumberingService } from './numbering.service';

/** Inventory settings feature module. Exports NumberingService for document refs. */
@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [SettingsController],
  providers: [SettingsService, NumberingService],
  exports: [SettingsService, NumberingService],
})
export class SettingsModule {}
