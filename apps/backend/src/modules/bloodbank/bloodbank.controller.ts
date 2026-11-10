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
import { BloodBankService } from './bloodbank.service';
import {
  CreateDonorDto,
  UpdateDonorDto,
  DonorQueryDto,
  CreateDonationDto,
  UpdateDonationStatusDto,
  DonationQueryDto,
  CreateBloodRequestDto,
  UpdateRequestStatusDto,
  BloodRequestQueryDto,
  CreateCrossMatchDto,
  CrossMatchQueryDto,
} from './dto/bloodbank.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Blood-bank endpoints (donors, donations, inventory, requests). */
@Controller('blood')
export class BloodBankController {
  constructor(private readonly service: BloodBankService) {}

  // Donors
  @Post('donors')
  createDonor(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateDonorDto,
  ) {
    return this.service.createDonor(tenantId, profile.branchId, dto);
  }

  @Get('donors')
  listDonors(@CurrentTenant() tenantId: string, @Query() query: DonorQueryDto) {
    return this.service.listDonors(tenantId, query);
  }

  @Get('donors/:id')
  getDonor(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.getDonor(id, tenantId);
  }

  @Patch('donors/:id')
  updateDonor(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDonorDto,
  ) {
    return this.service.updateDonor(id, tenantId, dto);
  }

  @Delete('donors/:id')
  removeDonor(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.removeDonor(id, tenantId);
  }

  // Donations
  @Post('donations')
  createDonation(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateDonationDto,
  ) {
    return this.service.createDonation(tenantId, profile.branchId, dto);
  }

  @Get('donations')
  listDonations(
    @CurrentTenant() tenantId: string,
    @Query() query: DonationQueryDto,
  ) {
    return this.service.listDonations(tenantId, query);
  }

  @Patch('donations/:id/status')
  updateDonationStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDonationStatusDto,
  ) {
    return this.service.updateDonationStatus(id, tenantId, dto);
  }

  // Inventory
  @Get('inventory')
  inventory(@CurrentTenant() tenantId: string) {
    return this.service.inventory(tenantId);
  }

  // Requests
  @Post('requests')
  createRequest(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @Body() dto: CreateBloodRequestDto,
  ) {
    return this.service.createRequest(tenantId, profile.branchId, dto);
  }

  @Get('requests')
  listRequests(
    @CurrentTenant() tenantId: string,
    @Query() query: BloodRequestQueryDto,
  ) {
    return this.service.listRequests(tenantId, query);
  }

  @Patch('requests/:id/status')
  updateRequestStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.service.updateRequestStatus(id, tenantId, dto);
  }

  // Cross-matching
  @Post('cross-matches')
  createCrossMatch(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateCrossMatchDto,
  ) {
    return this.service.createCrossMatch(
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Get('cross-matches')
  listCrossMatches(
    @CurrentTenant() tenantId: string,
    @Query() query: CrossMatchQueryDto,
  ) {
    return this.service.listCrossMatches(tenantId, query);
  }
}
