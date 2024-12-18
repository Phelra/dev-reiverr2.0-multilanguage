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

    try {
        const releaseList = await fetchReleases(sonarrItemId, selectedSeason);
        if (releaseList.length === 0) throw new Error('No releases found for this season.');

        const bestRelease = findBestReleaseByPoints(releaseList, selectedSeason);
        if (!bestRelease) throw new Error('No suitable release found.');

        await downloadRelease(bestRelease, setLoadingMessage);
    } catch (error) {
        const errorMessage = (error as Error).message;
        handleError(errorMessage);
        throw new Error(errorMessage);
    }
}

async function fetchReleases(
  sonarrItemId: number,
  selectedSeason: number
): Promise<Release[]> {
    return await retry(
        () => sonarrApi.getSeasonReleases(sonarrItemId, selectedSeason),
        (releases) => releases?.length > 0,
        { retries: 2 }
    ) || [];
}

function findBestReleaseByPoints(releases: Release[], selectedSeason: number): Release | undefined {
    return releases.reduce<Release | undefined>((bestRelease, release) => {
        const points = calculateSerieReleasePoints(release, selectedSeason);
        return points > (bestRelease ? calculateSerieReleasePoints(bestRelease, selectedSeason) : 0) ? release : bestRelease;
    }, undefined);
}

async function downloadRelease(
  release: Release,
  setLoadingMessage: (message: string) => void
): Promise<void> {
    setLoadingMessage(`(2/2) Downloading best release...`);
    
    const result = await sonarrApi.downloadSonarrRelease(release.guid || '', release.indexerId || -1);
    if (!result) throw new Error(`Failed to grab release: ${release.title}`);
}
