import { Module } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { CarouselController } from './carousel.controller';
import { carouselProviders } from './carousel.providers';
import { DatabaseModule } from '../database/database.module';
import { AuthGuard } from '../auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, JwtModule, UsersModule],
  providers: [CarouselService, ...carouselProviders, AuthGuard],
  controllers: [CarouselController],
})
export class CarouselModule {}
