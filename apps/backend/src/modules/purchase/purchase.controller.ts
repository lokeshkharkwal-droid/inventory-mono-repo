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
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import {
  CreatePurchasePaymentDto,
  UpdatePurchasePaymentDto,
  CreatePurchaseExpenseDto,
  SupplierBulkPaymentDto,
} from './dto/payment.dto';
import { ImportPurchasesDto } from './dto/import-purchases.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Purchase endpoints (tenant-scoped; stock applied at the active branch). */
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchaseService.create(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ImportPurchasesDto,
  ) {
    return this.purchaseService.import(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: PurchaseQueryDto) {
    return this.purchaseService.findAll(tenantId, query);
  }

  /** Supplier-payment screen: a supplier's purchases with an open balance. */
  @Get('supplier/:supplierId/outstanding')
  supplierOutstanding(
    @Param('supplierId') supplierId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.purchaseService.supplierOutstanding(supplierId, tenantId);
  }

  /** Record a bulk payment allocated across a supplier's open purchases. */
  @Post('supplier-payments')
  addSupplierPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: SupplierBulkPaymentDto,
  ) {
    return this.purchaseService.addSupplierPayment(tenantId, dto, personId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchaseService.update(id, tenantId, profile.branchId, dto);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreatePurchasePaymentDto,
  ) {
    return this.purchaseService.addPayment(id, tenantId, dto, personId);
  }

  @Patch(':id/payments/:paymentId')
  editPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePurchasePaymentDto,
  ) {
    return this.purchaseService.editPayment(id, paymentId, tenantId, dto);
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.purchaseService.deletePayment(id, paymentId, tenantId);
  }

  @Get(':id/expenses')
  expenses(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseService.listExpenses(id, tenantId);
  }

  @Post(':id/expenses')
  addExpense(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreatePurchaseExpenseDto,
  ) {
    return this.purchaseService.addExpense(id, tenantId, dto, personId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseService.remove(id, tenantId);
  }
}
