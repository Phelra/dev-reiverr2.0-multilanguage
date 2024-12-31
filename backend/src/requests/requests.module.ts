import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { requestProviders } from './requests.providers';
import { DatabaseModule } from '../database/database.module';
import { AuthGuard } from '../auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, JwtModule, UsersModule],
  providers: [RequestsService, ...requestProviders, AuthGuard],
  controllers: [RequestsController],
})
export class RequestsModule {}
