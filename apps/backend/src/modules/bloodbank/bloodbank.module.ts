import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BloodBankController } from './bloodbank.controller';
import { BloodBankService } from './bloodbank.service';

/** Blood-bank feature module (donors, donations, inventory, requests). */
@Module({
  imports: [PrismaModule],
  controllers: [BloodBankController],
  providers: [BloodBankService],
  exports: [BloodBankService],
})
export class BloodBankModule {}
