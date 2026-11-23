import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Inline "Add Referral" body from the Add-Sale page. A trimmed subset of
 * kalnostics' `CreateExternalReferralDto` — only the fields the EZHT inline
 * ReferralForm exposes (contact name + organisation + contact details). The
 * payload is forwarded to kalnostics `POST /external-referrals`, which applies
 * the full validation and defaults.
 */
export class CreateReferralDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  organisationName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referralCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileNumber?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  address?: string;
}
