import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterReferenceController } from './master-reference.controller';
import { MasterReferenceService } from './master-reference.service';

/**
 * SiteAdmin-managed canonical reference data (categories, sub-categories, units,
 * brands, tax rates) for the global master-product catalogue. Platform-level.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MasterReferenceController],
  providers: [MasterReferenceService],
  exports: [MasterReferenceService],
})
export class MasterReferenceModule {}
