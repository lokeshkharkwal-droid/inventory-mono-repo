import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import {
  CreateGiftCardDto,
  RedeemGiftCardDto,
  GiftCardQueryDto,
} from './dto/gift-card.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Gift-card endpoints (tenant-scoped via the JWT). */
@Controller('gift-cards')
export class GiftCardController {
  constructor(private readonly service: GiftCardService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateGiftCardDto,
  ) {
    return this.service.create(tenantId, profile.branchId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: GiftCardQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Post(':id/redeem')
  redeem(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: RedeemGiftCardDto,
  ) {
    return this.service.redeem(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
