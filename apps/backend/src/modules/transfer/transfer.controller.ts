import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import {
  CreateTransferDto,
  TransferQueryDto,
  ImportTransfersDto,
} from './dto/transfer.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Transfer endpoints (tenant-scoped; two-stage send/receive move stock). */
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transferService.create(tenantId, dto, personId);
  }

  @Post('import')
  import(
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: ImportTransfersDto,
  ) {
    return this.transferService.import(tenantId, dto, personId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: TransferQueryDto) {
    return this.transferService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transferService.findById(id, tenantId);
  }

  /** Send: remove stock from the source branch. */
  @Post(':id/send')
  send(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transferService.send(id, tenantId);
  }

  /** Receive: add stock to the destination branch. */
  @Post(':id/receive')
  receive(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transferService.receive(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transferService.remove(id, tenantId);
  }
}
