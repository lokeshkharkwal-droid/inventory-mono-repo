import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MasterSupplierService } from './master-supplier.service';
import {
  MasterSupplierQueryDto,
  CreateMasterSupplierDto,
  UpdateMasterSupplierDto,
} from './dto/master-supplier.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * SiteAdmin-managed canonical supplier directory for the global catalogue.
 * Every route requires a SiteAdmin token (`@Public()` bypasses the global
 * business guard; {@link SiteAdminGuard} enforces the SiteAdmin token). The
 * master-product form reads this list to populate its supplier picker.
 */
@Controller('master-suppliers')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterSupplierController {
  constructor(private readonly service: MasterSupplierService) {}

  /** List suppliers (paginate + search by name/company). */
  @Get()
  list(@Query() q: MasterSupplierQueryDto) {
    return this.service.list(q);
  }

  /**
   * Lightweight `{ id, name, company }` options for the master-product supplier
   * picker (search + paginate). Declared before `:id` so it is not captured as
   * an id param.
   */
  @Get('options')
  options(@Query() q: MasterSupplierQueryDto) {
    return this.service.options(q);
  }

  /** Fetch a single supplier. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Create a supplier. */
  @Post()
  create(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterSupplierDto,
  ) {
    return this.service.create(dto, by);
  }

  /** Update a supplier. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMasterSupplierDto) {
    return this.service.update(id, dto);
  }

  /** Soft-delete a supplier. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
