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
import { CurrencyService } from './currency.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyQueryDto,
} from './dto/currency.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Currency endpoints (tenant-scoped via the JWT). */
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCurrencyDto) {
    return this.currencyService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: CurrencyQueryDto) {
    return this.currencyService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.currencyService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currencyService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.currencyService.remove(id, tenantId);
  }
}
