import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsStockService } from './reports-stock.service';
import { ReportsSalesService } from './reports-sales.service';
import { ReportsIpdService } from './reports-ipd.service';
import { ReportsPurchasesService } from './reports-purchases.service';
import { ReportsFinanceService } from './reports-finance.service';
import { ReportsPartiesService } from './reports-parties.service';

/** Reporting/analytics module (read-only aggregations). */
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsStockService,
    ReportsSalesService,
    ReportsIpdService,
    ReportsPurchasesService,
    ReportsFinanceService,
    ReportsPartiesService,
  ],
  exports: [ReportsService, ReportsStockService],
})
export class ReportsModule {}
