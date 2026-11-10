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
import { EmailTemplateService } from './email-template.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
} from './dto/email-template.dto';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

/** Email/message template endpoints (tenant-scoped). */
@Controller('email-templates')
export class EmailTemplateController {
  constructor(private readonly service: EmailTemplateService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: EmailTemplateQueryDto,
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
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
