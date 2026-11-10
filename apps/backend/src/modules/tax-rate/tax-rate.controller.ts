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
import { TaxRateService } from './tax-rate.service';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxRateQueryDto,
} from './dto/tax-rate.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Tax rate endpoints (tenant-scoped via the JWT). */
@Controller('tax-rates')
export class TaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateTaxRateDto) {
    return this.taxRateService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: TaxRateQueryDto) {
    return this.taxRateService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.taxRateService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.taxRateService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.taxRateService.remove(id, tenantId);
  }
}
