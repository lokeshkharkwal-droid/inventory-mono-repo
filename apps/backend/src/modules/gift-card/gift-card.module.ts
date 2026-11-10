import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GiftCardController } from './gift-card.controller';
import { GiftCardService } from './gift-card.service';

/** Gift-card feature module. */
@Module({
  imports: [PrismaModule],
  controllers: [GiftCardController],
  providers: [GiftCardService],
  exports: [GiftCardService],
})
export class GiftCardModule {}
