import { writable, get } from 'svelte/store';
import { createModal, modalStack } from '../Modal/modal.store';
import { reiverrApi } from '../../apis/reiverr/reiverr-api';
import { tmdbApi } from '../../apis/tmdb/tmdb-api';
import { sonarrApi } from '../../apis/sonarr/sonarr-api';
import SelectSeason from '../SeriesPage/SelectSeason.svelte';
import SelectEpisode from '../SeriesPage/SelectEpisode.svelte';
import ConfirmDialog from '../Dialog/ConfirmDialog.svelte';
import SpinnerModal from '../SpinnerModal.svelte';
import { createSerieRequestApprouved, createSerieRequest } from '../Requests/requestCreation';
import { getOrAddSeriesToSonarr } from '../MediaManagerAuto/addSerieToSonarrAutomatically';
import { handleSeriesDownload } from '../MediaManagerAuto/AutoDownloadManagerSerie';
import { generalSettings } from '../../stores/generalSettings.store';

export const requestedSeasons = writable<number[]>([]);
export let requestExists = false;
export let pendingRequest = false;
export let loadingMessage = writable('');

export async function handleRequestSeason(tmdbId: number, currentUser: any) {
    console.log(`Starting handleRequestSeason with tmdbId: ${tmdbId} for user: ${currentUser?.id}`);
    try {
        const tmdbSeries = await tmdbApi.getTmdbSeries(tmdbId);
        console.log(`Fetched TMDb series with ID ${tmdbId}:`, tmdbSeries);

        const tvdbId = tmdbSeries.external_ids.tvdb_id;
        if (!tvdbId) {
            console.error("tvdbId is missing, cannot proceed with Sonarr request.");
            return;
        }

        const sonarrItem = await getOrAddSeriesToSonarr(
            tvdbId,
            tmdbSeries.name,
            () => console.log('Series added successfully to Sonarr.')
        );

        if (!sonarrItem) {
            console.error('Failed to process series in Sonarr.');
            return;
        }

        console.log('Sonarr item retrieved:', sonarrItem);
        const userSelection = await SelectSeasonAndEpisode(sonarrItem);
        console.log('User selection from SelectSeasonAndEpisode:', userSelection);

        await checkQuotaAndCreateRequest(
            userSelection.season,
            sonarrItem,
            userSelection.episode,
            userSelection.choice,
            tmdbId,
            currentUser
        );
    } catch (error) {
        console.error('Error handling request for season:', error);
    }
}

export async function SelectSeasonAndEpisode(sonarrItem: any) {
    console.log(`Starting SelectSeasonAndEpisode for Sonarr item ID: ${sonarrItem.id}`);
    const validSeasons = sonarrItem.seasons.filter(s => s.seasonNumber > 0);
    const seasonNumbers = validSeasons.map(s => s.seasonNumber);
    console.log(`Valid seasons for selection: ${seasonNumbers}`);

    const statusResults = await Promise.all(
        seasonNumbers.map(seasonNumber =>
            sonarrApi.isSeasonFullyDownloaded(sonarrItem.id, seasonNumber)
                .then(isCompleted => (isCompleted ? seasonNumber : null))
                .catch(error => {
                    console.error(`Error checking season ${seasonNumber}: ${error}`);
                    return null;
                })
        )
    );

    const completedSeasons = statusResults.filter(season => season !== null) as number[];
    console.log('Completed seasons:', completedSeasons);

    const existingRequestedSeasons = get(requestedSeasons);
    const unavailableSeasons = [...new Set([...completedSeasons, ...existingRequestedSeasons])];
    console.log('Unavailable seasons:', unavailableSeasons);

    return new Promise((resolve, reject) => {
        createModal(SelectSeason, {
            seasons: writable(seasonNumbers),
            completedSeasons: writable(completedSeasons),
            requestedSeasons: writable(existingRequestedSeasons),
            unavailableSeasons: unavailableSeasons,
            selectedSeason: writable(null),
            onConfirm: async (season) => {
                try {
                    console.log(`Season ${season} selected by user.`);
                    const result = await handleEpisodeSelection(sonarrItem, season);
                    resolve(result);
                } catch (error) {
                    console.error('Error in onConfirm for season selection:', error);
                    reject(error);
                }
            }
        });
    });
}

export async function handleEpisodeSelection(sonarrItem: any, season: number) {
    console.log(`Starting handleEpisodeSelection for Sonarr item ID: ${sonarrItem.id}, season: ${season}`);
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, season);
    console.log(`Fetched episodes for season ${season}:`, episodes);

    const totalEpisodes = episodes.length;
    const downloadedEpisodes = episodes.filter(episode => episode.hasFile).length;
    const allEpisodesAired = episodes.every(episode => new Date(episode.airDate) <= new Date());

    console.log(`Season ${season} - Total episodes: ${totalEpisodes}, Downloaded episodes: ${downloadedEpisodes}, All episodes aired: ${allEpisodesAired}`);
    
    if (downloadedEpisodes === 0 && allEpisodesAired && totalEpisodes > 0) {
        console.log(`Automatic download option chosen for season ${season}`);
        return { sonarrItem, season, episode: null, choice: 1 }; // Choice 1: Automatic
    }
    return await openEpisodeSelectionModal(sonarrItem, season);
}

export async function openEpisodeSelectionModal(sonarrItem: any, seasonNumber: number) {
    console.log(`Opening episode selection modal for season ${seasonNumber} of Sonarr item ID: ${sonarrItem.id}`);
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, seasonNumber);
    console.log('Episodes for selection:', episodes);

    const formattedEpisodes = episodes.map(episode => ({
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        hasFile: episode.hasFile,
        airDate: episode.airDate
    }));
    console.log('Formatted episodes for modal:', formattedEpisodes);

    return new Promise((resolve, reject) => {
        createModal(SelectEpisode, {
            episodes: writable(formattedEpisodes),
            selectedEpisode: writable(null),
            onConfirm: async (selected) => {
                if (selected !== null) {
                    try {
                        console.log(`Episode ${selected.episodeNumber} selected.`);
                        await sonarrApi.monitorEpisode(selected.id);
                        await sonarrApi.searchEpisode(selected.id);
                        resolve(selected);
                    } catch (error) {
                        console.error('Error during episode monitoring/search:', error);
                        reject(error);
                    }
                } else {
                    reject('No episode selected');
                }
            },
            onCancel: () => {
                console.log('Episode selection modal canceled.');
                reject('Modal was canceled');
            }
        });
    });
}

export async function checkQuotaAndCreateRequest(season: number, sonarrItem: any, episode: number | null, choice: number, tmdbId: number, currentUser: any) {
    console.log(`Checking quota and creating request. Season: ${season}, Episode: ${episode ?? 'Full Season'}, Choice: ${choice}`);
    const userId = currentUser?.id;
    const settings = get(generalSettings);
    console.log('Fetched general settings:', settings);

    const days = settings.data?.requests?.delayInDays ?? 30;
    const maxRequests = settings.data?.requests?.defaultLimitTV ?? 3;
    const userRequestCount = await reiverrApi.countRequestsInPeriodForUser(userId, days);
    console.log(`User request count: ${userRequestCount}`);

    const remainingRequests = Math.max(0, maxRequests - userRequestCount);
    const approvalMethod = settings.data?.requests.approvalMethod ?? 0;
    const setLimit = settings.data?.requests.setLimit ?? false;
    const canAutoApprove = currentUser?.isAdmin || (remainingRequests > 0 && approvalMethod === 0 && setLimit === true);

    console.log(`Quota check - Remaining requests: ${remainingRequests}, Can auto-approve: ${canAutoApprove}`);
    
    if (canAutoApprove) {
        createApprovedRequestDialog(remainingRequests, days, maxRequests, sonarrItem, season, choice, episode, approvalMethod, tmdbId, currentUser);
    } else {
        createPendingRequestDialog(season, episode, tmdbId, currentUser);
    }
}

export function createApprovedRequestDialog(remainingRequests: number, days: number, maxRequests: number, sonarrItem: any, season: number, choice: number, selectedEpisode: number | null, approvalMethod?: number, tmdbId?: number, currentUser?: any) {
    let bodyMessage = '';

    if (approvalMethod === 1) {
        bodyMessage = `Your request will be automatically approved, and the media search will begin.`;
    } else if (remainingRequests > 0 && approvalMethod === 0) {
        bodyMessage = `You have ${remainingRequests}/${maxRequests} requests remaining that will be automatically approved. Requests reset every ${days} days.`;
    } else {
        bodyMessage = `You have reached your limit of ${maxRequests} requests. Requests reset every ${days} days. Further requests will require admin approval.`;
    }

    console.log(`Creating approved request dialog. Body message: "${bodyMessage}"`);

    createModal(ConfirmDialog, {
        header: 'Confirm Automatic Search',
        body: bodyMessage,
        confirm: async () => {
            console.log(`User confirmed request. Choice: ${choice}, Season: ${season}, Episode: ${selectedEpisode}`);
            if (choice === 1) {
                console.log(`Automatic download for season ${season}`);
                await automaticDownloadSeason(sonarrItem, season, tmdbId, currentUser);
            } else if (choice === 2) {
                await sonarrApi.monitorSeason(sonarrItem.id, season, true);
                await sonarrApi.searchSeason(sonarrItem.id, season);
            } else if (choice === 3 && selectedEpisode !== undefined) {
                await sonarrApi.monitorEpisode(selectedEpisode);
                await sonarrApi.searchEpisode(selectedEpisode);
            }
        }
    });
}

export async function automaticDownloadSeason(sonarrItem: any, season: number, tmdbId: number, currentUser: any) { 
    console.log(`Initiating automatic download for Sonarr item ID: ${sonarrItem.id}, season: ${season}`);
    modalStack.closeTopmost();
    createModal(SpinnerModal, {
        title: 'Processing Series Download',
        progressMessage: loadingMessage
    });
    try {
        await handleSeriesDownload(sonarrItem.id, season, (message: string) => { 
            loadingMessage.set(message);
        }, (error: string) => {
            createErrorDialog(error, () => automaticDownloadSeason(sonarrItem, season, tmdbId, currentUser));
        });
        await createSerieRequestApprouved(tmdbId, currentUser, season, null); 
        requestExists = true;
        pendingRequest = false;
        console.log(`Download for season ${season} completed.`);
    } catch (error: any) {
        console.error(`Failed to download season ${season}:`, error);
        createErrorDialog(error.message || 'Failed to download the series.');
    }
}

export function createPendingRequestDialog(season: number, episode: number | null, tmdbId: number, currentUser: any) {
    console.log(`Creating pending request dialog for season ${season}, episode ${episode}`);
    createModal(ConfirmDialog, {
        header: 'Confirm Request',
        body: `Do you want to request season ${season}? An administrator will have to approve it before it appears in the library.`,
        confirm: async () => {
            try {
                console.log(`Creating series request for TMDb ID: ${tmdbId}, season: ${season}, episode: ${episode}`);
                await createSerieRequest(tmdbId, currentUser, season, episode);
                requestedSeasons.update(seasons => [...seasons, season]); 
                console.log(`Request created for season ${season}.`);
            } catch (error) {
                console.error('Error confirming request creation:', error);
            }
        }
    });
}

function createErrorDialog(error: string, retryCallback?: () => void) {
    console.log(`Creating error dialog for error: ${error}`);
    createModal(ConfirmDialog, {
        header: 'Download Error',
        body: `An error occurred while downloading the season: ${error} Do you want to retry downloading the series?`,
        confirm: () => {
            console.log('Retrying download.');
            modalStack.closeTopmost();
            if (retryCallback) retryCallback();
        },
        cancel: () => {
            console.log('Error dialog dismissed.');
            modalStack.closeTopmost();
        }
    });
}
