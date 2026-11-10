import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionQueryDto,
} from './dto/promotion.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Promotion / banner endpoints (tenant-scoped). */
@Controller('promotions')
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePromotionDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: PromotionQueryDto,
  ) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
