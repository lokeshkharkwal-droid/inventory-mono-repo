import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequisitionService } from './requisition.service';
import {
  ApproveRequisitionDto,
  ConvertToTransferDto,
  CreateRequisitionDto,
  RejectRequisitionDto,
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
    @CurrentProfile() profile: ActiveProfile,
    @Query() query: RequisitionQueryDto,
  ) {
    return this.requisitionService.findAll(tenantId, query, profile.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.requisitionService.findById(id, tenantId);
  }

  /** Render the requisition as a PDF via the kalnostics print engine. */
  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, reference } =
      await this.requisitionService.renderRequisitionPdf(id, tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="requisition-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.requisitionService.update(id, tenantId, dto, personId);
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
    @Body() dto: RejectRequisitionDto,
  ) {
    return this.requisitionService.reject(id, tenantId, dto, personId);
  }

  @Post(':id/receive')
  receive(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
  ) {
    return this.requisitionService.receive(id, tenantId, personId);
  }

  @Post(':id/convert-to-transfer')
  convertToTransfer(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ConvertToTransferDto,
  ) {
    return this.requisitionService.convertToTransfer(
      id,
      tenantId,
      dto,
      personId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.requisitionService.remove(id, tenantId);
  }
}
