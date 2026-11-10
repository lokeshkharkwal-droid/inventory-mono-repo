import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Set the exact permission-key set for a role (optionally rename a custom role). */
export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

/** Create a custom role from a display name (+ optional starting permissions). */
export class CreateRoleDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/** Assign a role to a user (by kalnostics person id). */
export class AssignUserRoleDto {
  @IsString()
  personId: string;

  @IsString()
  roleKey: string;
}
