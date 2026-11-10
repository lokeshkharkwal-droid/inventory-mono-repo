import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PosService } from './pos.service';
import {
  CloseSessionDto,
  CreateRegisterDto,
  OpenSessionDto,
  PosCheckoutDto,
  VerifyPinDto,
  HoldBillDto,
} from './dto/pos.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** POS endpoints (tenant-scoped; operate at the active branch). */
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('registers')
  createRegister(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateRegisterDto,
  ) {
    return this.posService.createRegister(tenantId, profile.branchId, dto);
  }

  @Get('registers')
  listRegisters(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ) {
    return this.posService.listRegisters(tenantId, profile.branchId);
  }

  @Post('verify-pin')
  verifyPin(@CurrentTenant() tenantId: string, @Body() dto: VerifyPinDto) {
    return this.posService.verifyPin(tenantId, dto.pin);
  }

  @Get('gateway-balances')
  gatewayBalances() {
    return this.posService.gatewayBalances();
  }

  @Get('serial-lookup')
  serialLookup(
    @CurrentTenant() tenantId: string,
    @Query('serial') serial: string,
  ) {
    return this.posService.serialLookup(tenantId, serial ?? '');
  }

  @Get('held-bills')
  listHeldBills(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ) {
    return this.posService.listHeldBills(tenantId, profile.branchId);
  }

  @Post('held-bills')
  holdBill(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: HoldBillDto,
  ) {
    return this.posService.holdBill(tenantId, profile.branchId, dto, personId);
  }

  @Delete('held-bills/:id')
  deleteHeldBill(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.posService.deleteHeldBill(id, tenantId);
  }

  @Post('sessions/open')
  openSession(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: OpenSessionDto,
  ) {
    return this.posService.openSession(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Get('sessions/current')
  currentSession(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
  ) {
    return this.posService.currentSession(tenantId, profile.branchId);
  }

  @Post('sessions/:id/close')
  closeSession(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.posService.closeSession(id, tenantId, dto, personId);
  }

  @Post('checkout')
  checkout(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: PosCheckoutDto,
  ) {
    return this.posService.checkout(tenantId, profile.branchId, dto, personId);
  }

  @Get('lookup')
  lookup(@CurrentTenant() tenantId: string, @Query('search') search?: string) {
    return this.posService.lookup(tenantId, search);
  }
}
