import { get } from 'svelte/store';
import { generalSettings } from '../../stores/generalSettings.store';
import { radarrApi } from '../../apis/radarr/radarr-api';

export async function getOrAddMovieToRadarr(
  tmdbId: number,
  title: string,
  onComplete: () => void = () => {}
): Promise<any | null> {
  try {
    const settings = get(generalSettings)?.data?.integrations?.radarr;

    if (!settings || !settings.apiKey || !settings.baseUrl || !settings.qualityProfileId || !settings.rootFolderPath) {
      console.error('Radarr settings are missing or incomplete.');
      alert('Please configure Radarr settings before proceeding.');
      throw new Error('Radarr settings are missing.');
    }

    let radarrItem = await radarrApi.getMovieByTmdbId(tmdbId);

    if (!radarrItem) {
      const success = await radarrApi.addMovieToRadarr(tmdbId, {
        rootFolderPath: settings.rootFolderPath,
        qualityProfileId: settings.qualityProfileId,
        minimumAvailability: settings.minimumAvailability || 'released',
      });

      if (!success) {
        console.error(`Failed to add movie "${title}" to Radarr.`);
        return null;
      }

      radarrItem = await radarrApi.getMovieByTmdbId(tmdbId);
      if (!radarrItem || radarrItem.id === undefined) {
        console.error('Failed to retrieve movie from Radarr after adding.');
        return null;
      }
    }

    onComplete();

    return radarrItem;

  } catch (error) {
    console.error('Error in getOrAddMovieToRadarr:', error);
    return null;
  }
}
