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
import { QuoteService } from './quote.service';
import {
  BulkDeleteQuotesDto,
  CreateQuoteDto,
  MarkQuoteConvertedDto,
  QuoteQueryDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProfile } from '../auth/decorators/current-profile.decorator';
import type { ActiveProfile } from '../auth/decorators/current-profile.decorator';

/** Quote endpoints (tenant-scoped; convert-to-sale uses the active branch). */
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quoteService.create(tenantId, profile.branchId, dto, personId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: QuoteQueryDto) {
    return this.quoteService.findAll(tenantId, query);
  }

  /** Bulk soft-delete (EZHT listing "Delete" bulk action). */
  @Post('bulk-delete')
  bulkDelete(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkDeleteQuotesDto,
  ) {
    return this.quoteService.removeMany(dto.ids, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quoteService.findById(id, tenantId);
  }

  /** Full detail for the view page (party, branch, creator, status history). */
  @Get(':id/detail')
  detail(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quoteService.getDetail(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quoteService.update(
      id,
      tenantId,
      profile.branchId,
      dto,
      personId,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.quoteService.updateStatus(id, tenantId, dto, personId);
  }

  /** Link a quote to the sale/purchase created from its prefill, marking it CONVERTED. */
  @Post(':id/mark-converted')
  markConverted(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: MarkQuoteConvertedDto,
  ) {
    return this.quoteService.markConvertedTo(
      id,
      tenantId,
      dto.convertedToId,
      personId,
    );
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentProfile() profile: ActiveProfile,
    @CurrentUser('person_id') personId: string,
  ) {
    return this.quoteService.convert(id, tenantId, profile.branchId, personId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quoteService.remove(id, tenantId);
  }
}
