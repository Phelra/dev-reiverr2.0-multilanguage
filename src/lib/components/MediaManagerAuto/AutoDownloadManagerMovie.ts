// handleMovieDownload.ts
import { radarrApi } from '../../apis/radarr/radarr-api';
import { retry, calculateMovieReleaseScore } from '../../utils';
import type { Release } from '../../apis/combined-types';

export async function handleMovieDownload(
  radarrItemId: number, 
  setLoadingMessage: (message: string) => void, 
  handleError: (error: string) => void
): Promise<void> {
    setLoadingMessage('(1/2) Checking for best releases...');
    const releaseList = await fetchReleases(radarrItemId, handleError);

    if (releaseList.length > 0) {
        const bestRelease = findBestRelease(releaseList);
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
        handleError('No releases found for this movie.');
        throw new Error('No releases found for this movie.');
    }
}

async function fetchReleases(radarrItemId: number, handleError: (error: string) => void): Promise<Release[]> {
    try {
        const releaseList = await retry(() => radarrApi.getReleases(radarrItemId), (v) => !!v?.length, { retries: 2 });
        return releaseList.length ? releaseList : [];
    } catch (error) {
        handleError('Error fetching releases: ' + (error as Error).message);
        throw new Error('Error fetching releases: ' + (error as Error).message);
    }
}

function findBestRelease(releases: Release[]): Release | undefined {
    let bestRelease = releases.reduce((best, current) => 
        (current.customFormatScore ?? 0) > (best.customFormatScore ?? 0) ? current : best, releases[0]);

    if (bestRelease.customFormatScore === 0) {
        bestRelease = findBestReleaseByPoints(releases) || bestRelease;
    }

    return bestRelease;
}

function findBestReleaseByPoints(releases: Release[]): Release | undefined {
    let bestRelease: Release | undefined = undefined;
    let maxPoints = 0;

    releases.forEach((release) => {
        const points = calculateMovieReleaseScore(release);
        if (points > maxPoints) {
            maxPoints = points;
            bestRelease = release;
        }
    });

    return bestRelease;
}

async function downloadRelease(release: Release, setLoadingMessage: (message: string) => void, handleError: (error: string) => void): Promise<boolean> { // Retourne un booléen
    setLoadingMessage(`(2/2) Downloading best release...`);

    try {
        const result = await radarrApi.downloadMovie(release.guid || '', release.indexerId || -1);
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
