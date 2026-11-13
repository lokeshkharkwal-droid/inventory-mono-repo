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
import { MasterManufacturerService } from './master-manufacturer.service';
import {
  MasterManufacturerQueryDto,
  CreateMasterManufacturerDto,
  UpdateMasterManufacturerDto,
} from './dto/master-manufacturer.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SiteAdminGuard } from '../auth/guards/siteadmin.guard';
import { CurrentSiteAdmin } from '../auth/decorators/current-siteadmin.decorator';

/**
 * SiteAdmin-managed canonical manufacturer directory for the global catalogue.
 * Every route requires a SiteAdmin token (`@Public()` bypasses the global
 * business guard; {@link SiteAdminGuard} enforces the SiteAdmin token). The
 * master-product form reads this list to populate its manufacturer dropdown.
 */
@Controller('master-manufacturers')
@Public()
@UseGuards(SiteAdminGuard)
export class MasterManufacturerController {
  constructor(private readonly service: MasterManufacturerService) {}

  /** List manufacturers (paginate + search by name/company). */
  @Get()
  list(@Query() q: MasterManufacturerQueryDto) {
    return this.service.list(q);
  }

  /** Fetch a single manufacturer. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Create a manufacturer. */
  @Post()
  create(
    @CurrentSiteAdmin('siteadmin_id') by: string,
    @Body() dto: CreateMasterManufacturerDto,
  ) {
    return this.service.create(dto, by);
  }

  /** Update a manufacturer. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMasterManufacturerDto) {
    return this.service.update(id, dto);
  }

  /** Soft-delete a manufacturer. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
