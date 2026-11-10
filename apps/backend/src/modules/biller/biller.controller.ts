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
import { BillerService } from './biller.service';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerQueryDto,
} from './dto/biller.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Biller endpoints (tenant-scoped via the JWT). */
@Controller('billers')
export class BillerController {
  constructor(private readonly billerService: BillerService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBillerDto) {
    return this.billerService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: BillerQueryDto) {
    return this.billerService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.billerService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateBillerDto,
  ) {
    return this.billerService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.billerService.remove(id, tenantId);
  }
}
