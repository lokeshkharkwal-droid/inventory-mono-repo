import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** List filters for notifications. */
export class NotificationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  /** When true, return only unread notifications. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

/** Create an ad-hoc notification (system/info message). */
export class CreateNotificationDto {
  @IsString() @MaxLength(50) type: string;
  @IsString() @MaxLength(255) title: string;
  @IsOptional() @IsString() @MaxLength(2000) body?: string;
  @IsOptional() @IsString() @MaxLength(500) link?: string;
}
