import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryDto,
  DeliveryQueryDto,
  UpdateDeliveryDto,
  UpdateDeliveryStatusDto,
} from './dto/delivery.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Sale delivery endpoints (tenant-scoped). */
@Controller('sale-deliveries')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.service.create(tenantId, profile.branchId, dto, personId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: DeliveryQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  /** One delivery enriched with sale items + created-by (detail modal). */
  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.getDetail(id, tenantId);
  }

  /**
   * Render this delivery as a PDF (via the mapped `inventory_delivery` kalnostics
   * print template) and stream it back as `application/pdf`. A library-specific
   * response so the global ResponseInterceptor doesn't wrap the binary.
   */
  @Get(':id/delivery-pdf')
  async deliveryPdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, reference } = await this.service.renderDeliveryPdf(
      id,
      tenantId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="delivery-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.service.updateStatus(id, tenantId, dto);
  }
}
