import {
    Controller,
    Get,
    Patch,
    Body,
    UseGuards,
    ForbiddenException,
  } from '@nestjs/common';
  import { SettingsService } from './settings.service';
  import { UpdateSettingsDto } from './settings.dto';
  import { AuthGuard, GetUser } from '../auth/auth.guard';
  import { User } from '../users/user.entity';
  
  @Controller('settings')
  export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}
  
    @Get()
    async getSettings() {
      const settings = await this.settingsService.getSettings();
      console.log('Settings fetched:', settings);
      return settings;
    }
  
    @UseGuards(AuthGuard)
    @Patch()
    async updateSettings(
      @Body() updateSettingsDto: UpdateSettingsDto,
      @GetUser() user: User,
    ) {
      if (!user.isAdmin) {
        throw new ForbiddenException('You are not authorized to update settings');
      }
      return this.settingsService.updateSettings(updateSettingsDto, user);
    }
  }
  