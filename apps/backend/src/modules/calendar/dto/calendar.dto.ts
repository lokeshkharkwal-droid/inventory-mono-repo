import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Create a calendar event. */
export class CreateCalendarEventDto {
  @IsString() @MaxLength(255) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsDateString() startAt: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsBoolean() isAllDay?: boolean;
}

/** Update a calendar event (all fields optional). */
export class UpdateCalendarEventDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsBoolean() isAllDay?: boolean;
}

/** Date-window filter for listing calendar events. */
export class CalendarQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
