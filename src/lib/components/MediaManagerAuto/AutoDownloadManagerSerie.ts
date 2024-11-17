import { sonarrApi } from '../../apis/sonarr/sonarr-api';
import { retry, calculateSerieReleasePoints } from '../../utils';
import type { Release } from '../../apis/combined-types';

export async function handleSeriesDownload(
  sonarrItemId: number, 
  selectedSeason: number, 
  setLoadingMessage: (message: string) => void, 
  handleError: (error: string) => void
): Promise<void> {
    setLoadingMessage(`(1/2) Checking for best releases for season ${selectedSeason}...`);

    const releaseList = await fetchReleases(sonarrItemId, selectedSeason, handleError);

    if (releaseList.length > 0) {
        const bestRelease = findBestReleaseByPoints(releaseList, selectedSeason);

        if (bestRelease) {
            const downloadResult = await downloadRelease(bestRelease, setLoadingMessage, handleError);
            if (!downloadResult) {
                throw new Error('Download failed for the best release.');
            }
        } else {
            handleError('No suitable release found.');
            throw new Error('No suitable release found.');
        }
    } else {
        handleError('No releases found for this season.');
        throw new Error('No releases found for this season.');
    }
}

async function fetchReleases(
  sonarrItemId: number, 
  selectedSeason: number, 
  handleError: (error: string) => void
): Promise<Release[]> {
    try {
        const releaseList = await retry(() => sonarrApi.getSeasonReleases(sonarrItemId, selectedSeason), (v) => !!v?.length, { retries: 2 });
        return releaseList.length ? releaseList : [];
    } catch (error) {
        handleError(`Error fetching releases for season ${selectedSeason}: ${(error as Error).message}`);
        throw new Error(`Error fetching releases for season ${selectedSeason}: ${(error as Error).message}`); // Propage l'erreur
    }
}

function findBestReleaseByPoints(releases: Release[], selectedSeason: number): Release | undefined {
    let bestRelease: Release | undefined = undefined;
    let maxPoints = 0;

    releases.forEach((release) => {
        const points = calculateSerieReleasePoints(release, selectedSeason);
        if (points > maxPoints) {
            maxPoints = points;
            bestRelease = release;
        }
    });

    return bestRelease;
}

async function downloadRelease(
  release: Release, 
  setLoadingMessage: (message: string) => void, 
  handleError: (error: string) => void
): Promise<boolean> {
    setLoadingMessage(`(2/2) Downloading best release...`);

    try {
        const result = await sonarrApi.downloadSonarrRelease(release.guid || '', release.indexerId || -1);
        if (!result) {
            handleError(`Failed to grab release: ${release.title}`);
            throw new Error(`Failed to grab release: ${release.title}`);
        }
        return true;
    } catch (error) {
        handleError(`Error during grabbing release: ${(error as Error).message}`);
        throw new Error(`Error during grabbing release: ${(error as Error).message}`);
    }
}
