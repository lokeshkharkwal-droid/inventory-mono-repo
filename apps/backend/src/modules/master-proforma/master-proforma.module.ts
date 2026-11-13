import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterProformaController } from './master-proforma.controller';
import { MasterProformaService } from './master-proforma.service';

/**
 * SiteAdmin-managed master proformas — reusable, platform-level line-item
 * templates (master product + optional lab-test + quantity). Platform-level.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MasterProformaController],
  providers: [MasterProformaService],
  exports: [MasterProformaService],
})
export class MasterProformaModule {}
