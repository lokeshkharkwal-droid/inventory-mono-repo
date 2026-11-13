import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterCatalogService } from './master-catalog.service';
import {
  MasterFinanceCategoriesController,
  MasterManufacturersController,
  MasterProformasController,
  MasterSettingsController,
  MasterSuppliersController,
} from './master-catalog.controller';

/** SiteAdmin-managed platform catalogue (suppliers, manufacturers, proformas, settings, finance categories). */
@Module({
  imports: [PrismaModule],
  controllers: [
    MasterSuppliersController,
    MasterManufacturersController,
    MasterProformasController,
    MasterSettingsController,
    MasterFinanceCategoriesController,
  ],
  providers: [MasterCatalogService],
})
export class MasterCatalogModule {}
