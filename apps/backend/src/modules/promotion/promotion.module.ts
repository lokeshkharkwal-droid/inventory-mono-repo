import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

/** Promotions / banners feature module (legacy Welcome promotions). */
@Module({
  imports: [PrismaModule],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
