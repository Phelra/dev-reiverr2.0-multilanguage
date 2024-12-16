import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import { UpdateSettingsDto } from './settings.dto';
import { User } from '../users/user.entity';

@Injectable()
export class SettingsService {
  constructor(
    @Inject('SETTINGS_REPOSITORY')
    private settingsRepository: Repository<Settings>,
  ) {}

  async getSettings(): Promise<Settings> {
    const settings = await this.settingsRepository.find();

    if (settings.length === 0) {
      const defaultSettings = this.settingsRepository.create({
        integrations: {
          sonarr: {
            apiKey: '',
            baseUrl: '',
            qualityProfileId: 0,
            rootFolderPath: '',
            languageProfileId: 0,
          },
          radarr: {
            apiKey: '',
            baseUrl: '',
            qualityProfileId: 0,
            rootFolderPath: '',
          },
          jellyfin: {
            apiKey: '',
            baseUrl: '',
          },
          tmdb: {
            userId: '',
            sessionId: '',
          },
        },
        requests: {
          allowRequests: true,
          approvalMethod:0,
          setLimit:false,
          defaultLimitMovies: 0,
          defaultLimitTV: 0,
          delayInDays: 7,
        },
      });
      
      await this.settingsRepository.save(defaultSettings);
      return defaultSettings;
    }
    
    return settings[0];
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto, user: User): Promise<Settings> {
    if (!user.isAdmin) {
      throw new ForbiddenException('Only admin users can update settings');
    }
  
    const settings = await this.settingsRepository.find();
    if (settings.length === 0) {
      throw new Error('Settings not found');
    }
  
    const currentSettings = settings[0];
  
    const mergedIntegrations = {
      sonarr: {
        ...currentSettings.integrations.sonarr,
        ...updateSettingsDto.integrations?.sonarr,
      },
      radarr: {
        ...currentSettings.integrations.radarr,
        ...updateSettingsDto.integrations?.radarr,
      },
      jellyfin: {
        ...currentSettings.integrations.jellyfin,
        ...updateSettingsDto.integrations?.jellyfin,
      },
      tmdb: {
        ...currentSettings.integrations.tmdb,
        ...updateSettingsDto.integrations?.tmdb,
      },
    };
  
    const mergedRequests = {
      ...currentSettings.requests,
      ...updateSettingsDto.requests,
    };
  
    this.settingsRepository.merge(currentSettings, {
      integrations: mergedIntegrations,
      requests: mergedRequests,
    });
  
    return this.settingsRepository.save(currentSettings);
  }
  
}
