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
import { VariantService } from './variant.service';
import {
  CreateVariantDto,
  UpdateVariantDto,
  VariantQueryDto,
} from './dto/variant.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Variant/option template endpoints (tenant-scoped via the JWT). */
@Controller('variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateVariantDto) {
    return this.variantService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: VariantQueryDto) {
    return this.variantService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.variantService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variantService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.variantService.remove(id, tenantId);
  }
}
