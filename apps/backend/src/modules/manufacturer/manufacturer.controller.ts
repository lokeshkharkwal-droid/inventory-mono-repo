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
import { ManufacturerService } from './manufacturer.service';
import {
  CreateManufacturerDto,
  UpdateManufacturerDto,
  ManufacturerQueryDto,
  ImportManufacturersDto,
} from './dto/manufacturer.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Manufacturer endpoints (tenant-scoped via the JWT). */
@Controller('manufacturers')
export class ManufacturerController {
  constructor(private readonly service: ManufacturerService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateManufacturerDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @Body() dto: ImportManufacturersDto,
  ) {
    return this.service.import(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ManufacturerQueryDto,
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
    @Body() dto: UpdateManufacturerDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
