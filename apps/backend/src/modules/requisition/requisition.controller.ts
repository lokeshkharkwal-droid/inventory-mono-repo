import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import {
  ApproveRequisitionDto,
  CreateRequisitionDto,
  RequisitionQueryDto,
} from './dto/requisition.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Requisition endpoints (tenant-scoped; requesting branch = active branch). */
@Controller('requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.requisitionService.create(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: RequisitionQueryDto,
  ) {
    return this.requisitionService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.requisitionService.findById(id, tenantId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ApproveRequisitionDto,
  ) {
    return this.requisitionService.approve(id, tenantId, dto, personId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
  ) {
    return this.requisitionService.reject(id, tenantId, personId);
  }

  @Post(':id/receive')
  receive(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.requisitionService.receive(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.requisitionService.remove(id, tenantId);
  }
}
