import { get } from 'svelte/store';
import { generalSettings } from '../../stores/generalSettings.store';
import { sonarrApi } from '../../apis/sonarr/sonarr-api';

export async function getOrAddSeriesToSonarr(
  tmdbId: number,
  title: string,
  onComplete: () => void = () => {}
): Promise<any | null> {
  try {
    const settings = get(generalSettings)?.data?.integrations?.sonarr;

    if (!settings || !settings.apiKey || !settings.baseUrl || !settings.qualityProfileId || !settings.rootFolderPath || !settings.monitorStrategy) {
      console.error('Sonarr settings are missing or incomplete.');
      alert('Please configure Sonarr settings before proceeding.');
      throw new Error('Sonarr settings are missing.');
    }

    let sonarrItem = await sonarrApi.getSeriesByTmdbId(tmdbId);
    
    if (!sonarrItem || !hasValidSeasons(sonarrItem)) {
      console.log(`Adding series "${title}" to Sonarr...`);

      const success = await sonarrApi.addToSonarr(tmdbId, {
        rootFolderPath: settings.rootFolderPath,
        qualityProfileId: settings.qualityProfileId,
        monitorOptions: settings.monitorStrategy,
      });

      if (!success) {
        console.error(`Failed to add series "${title}" to Sonarr.`);
        return null;
      }

      if (typeof onComplete === 'function') {
        onComplete();
      }
      
      sonarrItem = await sonarrApi.getSeriesByTmdbId(tmdbId);
    }

    return hasValidSeasons(sonarrItem) ? sonarrItem : null;
  } catch (error) {
    console.error('Error in getOrAddSeriesToSonarr:', error);
    return null;
  }
}

function hasValidSeasons(sonarrItem: any): boolean {
  return sonarrItem?.seasons && sonarrItem.seasons.length > 0;
}
