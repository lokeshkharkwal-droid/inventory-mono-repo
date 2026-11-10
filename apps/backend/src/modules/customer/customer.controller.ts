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
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  ImportCustomersDto,
  CreateCustomerDepositDto,
} from './dto/customer.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Customer endpoints (tenant-scoped via the JWT). */
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(tenantId, dto);
  }

  @Post('import')
  import(@CurrentTenant() tenantId: string, @Body() dto: ImportCustomersDto) {
    return this.customerService.import(tenantId, dto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() query: CustomerQueryDto) {
    return this.customerService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.customerService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.customerService.remove(id, tenantId);
  }

  @Get(':id/deposits')
  deposits(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.customerService.listDeposits(id, tenantId);
  }

  @Post(':id/deposits')
  addDeposit(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('person_id') personId: string,
    @Body() dto: CreateCustomerDepositDto,
  ) {
    return this.customerService.addDeposit(id, tenantId, dto, personId);
  }
}
