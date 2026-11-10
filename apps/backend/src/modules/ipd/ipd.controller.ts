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
import { IpdService } from './ipd.service';
import {
  AdmissionQueryDto,
  CreateAdmissionDto,
  CreateChargeDto,
  UpdateAdmissionDto,
} from './dto/ipd.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** IPD (inpatient) admission endpoints (tenant-scoped). */
@Controller('ipd/admissions')
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Post()
  admit(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateAdmissionDto,
  ) {
    return this.ipdService.admit(tenantId, profile.branchId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: AdmissionQueryDto,
  ) {
    return this.ipdService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.ipdService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateAdmissionDto,
  ) {
    return this.ipdService.update(id, tenantId, dto);
  }

  @Post(':id/discharge')
  discharge(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.ipdService.discharge(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.ipdService.remove(id, tenantId);
  }

  @Post(':id/charges')
  addCharge(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.ipdService.addCharge(id, tenantId, dto, personId);
  }

  @Get(':id/charges')
  listCharges(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.ipdService.listCharges(id, tenantId);
  }
}
