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
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  ImportSuppliersDto,
  CreateSupplierPaymentDto,
} from './dto/supplier.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Supplier endpoints (tenant-scoped via the JWT). */
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.supplierService.create(tenantId, dto);
  }

  @Post('import')
  import(@CurrentTenant() tenantId: string, @Body() dto: ImportSuppliersDto) {
    return this.supplierService.import(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: SupplierQueryDto) {
    return this.supplierService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.supplierService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, tenantId, dto);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.supplierService.listPayments(id, tenantId);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateSupplierPaymentDto,
  ) {
    return this.supplierService.addPayment(id, tenantId, dto, personId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.supplierService.remove(id, tenantId);
  }
}
