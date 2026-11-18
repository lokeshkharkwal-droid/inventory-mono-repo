import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProformaConsumptionService } from './proforma-consumption.service';
import {
  ConsumeConsumptionDto,
  ValidateConsumptionDto,
} from './dto/consumption.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Inbound integration surface for proforma-driven inventory consumption. Called
 * by kalnostics-new (forwarding the user's JWT) around order creation, and by the
 * registration tooltip. Tenant comes from the JWT; the branch is passed explicitly
 * (it is the ORDER's branch, of which kalnostics is the source of truth).
 */
@Controller('proforma-consumption')
export class ProformaConsumptionController {
  constructor(private readonly service: ProformaConsumptionService) {}

  /** Pre-order stock check for an order's lab tests (no mutation). */
  @Post('validate')
  validate(
    @CurrentTenant() tenantId: string,
    @Body() dto: ValidateConsumptionDto,
  ) {
    return this.service.validate(tenantId, dto);
  }

  /** Deduct mapped products + record the linked sale (idempotent per order). */
  @Post('consume')
  consume(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ConsumeConsumptionDto,
  ) {
    return this.service.consume(tenantId, dto, personId);
  }

  /** Proforma + product/stock info for a single lab test (registration tooltip). */
  @Get('info')
  info(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId: string,
    @Query('labTestSourceId') labTestSourceId: string,
  ) {
    return this.service.info(tenantId, branchId, labTestSourceId);
  }
}
