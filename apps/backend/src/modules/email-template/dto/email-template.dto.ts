import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create an email/message template. */
export class CreateEmailTemplateDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(255) subject?: string;
  @IsOptional() @IsString() @MaxLength(20000) body?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update an email template (all fields optional). */
export class UpdateEmailTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) subject?: string;
  @IsOptional() @IsString() @MaxLength(20000) body?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** List filters for email templates. */
export class EmailTemplateQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}
