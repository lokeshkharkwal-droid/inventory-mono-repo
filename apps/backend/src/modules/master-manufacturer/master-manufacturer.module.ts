import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterManufacturerController } from './master-manufacturer.controller';
import { MasterManufacturerService } from './master-manufacturer.service';

/**
 * SiteAdmin-managed canonical manufacturer directory for the global
 * master-product catalogue. Platform-level.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MasterManufacturerController],
  providers: [MasterManufacturerService],
  exports: [MasterManufacturerService],
})
export class MasterManufacturerModule {}
