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
import { UnitService } from './unit.service';
import { CreateUnitDto, UpdateUnitDto, UnitQueryDto } from './dto/unit.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Units of measure endpoints (tenant-scoped via the JWT). */
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: UnitQueryDto) {
    return this.unitService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.unitService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.unitService.remove(id, tenantId);
  }
}
