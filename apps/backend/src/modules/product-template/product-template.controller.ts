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
import { ProductTemplateService } from './product-template.service';
import {
  CreateProductTemplateDto,
  UpdateProductTemplateDto,
  ProductTemplateQueryDto,
  CreateFromTemplateDto,
} from './dto/product-template.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Product-template endpoints (legacy SITE master_products). */
@Controller('product-templates')
export class ProductTemplateController {
  constructor(private readonly service: ProductTemplateService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductTemplateDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ProductTemplateQueryDto,
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
    @Body() dto: UpdateProductTemplateDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Post(':id/create-product')
  createProduct(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateFromTemplateDto,
  ) {
    return this.service.createProduct(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
