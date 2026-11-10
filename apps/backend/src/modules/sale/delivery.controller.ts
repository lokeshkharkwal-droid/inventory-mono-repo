import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryDto,
  DeliveryQueryDto,
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

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.service.updateStatus(id, tenantId, dto);
  }
}
