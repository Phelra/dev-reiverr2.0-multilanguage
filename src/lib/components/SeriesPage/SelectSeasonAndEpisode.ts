import {
    type EpisodeDownload,
    type EpisodeFileResource,
    sonarrApi
} from '../../apis/sonarr/sonarr-api';
import { createModal, modalStack } from '../Modal/modal.store';
import { get, writable } from 'svelte/store';
import EpisodeSelectionDialog from '../Dialog/EpisodeSelectionDialog.svelte';
import SelectSeason from './SelectSeason.svelte';
import SelectEpisode from './SelectEpisode.svelte';

export async function SelectSeasonAndEpisode(sonarrItem: any, requestedSeasons:any) {
    const validSeasons = sonarrItem.seasons.filter(s => s.seasonNumber > 0);
    const seasonNumbers = validSeasons.map(s => s.seasonNumber);

    const statusResults = await Promise.all(
        seasonNumbers.map(seasonNumber => 
            sonarrApi.isSeasonFullyDownloaded(sonarrItem.id, seasonNumber)
                .then(isCompleted => isCompleted ? seasonNumber : null)
                .catch(error => {
                    console.error(`Error checking season ${seasonNumber}: ${error}`);
                    return null;
                })
        )
    );

    const completedSeasons = statusResults.filter(season => season !== null) as number[];
    const existingRequestedSeasons = get(requestedSeasons);
    const unavailableSeasons = [...new Set([...completedSeasons, ...existingRequestedSeasons])];

    return new Promise((resolve, reject) => {
        createModal(SelectSeason, {
            seasons: writable(seasonNumbers),
            completedSeasons: writable(completedSeasons),
            requestedSeasons: writable(existingRequestedSeasons),
            unavailableSeasons: unavailableSeasons,
            selectedSeason: writable(null),
            onConfirm: async (season) => {
                try {
                    const result = await handleEpisodeSelection(sonarrItem, season);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

async function handleEpisodeSelection(sonarrItem: any, season: number) {
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, season);

    const totalEpisodes = episodes.length;
    const downloadedEpisodes = episodes.filter(episode => episode.hasFile).length;
    const allEpisodesAired = episodes.every(episode => new Date(episode.airDate) <= new Date());

    if (downloadedEpisodes === 0 && allEpisodesAired && totalEpisodes > 0) {
        return { sonarrItem, season, episode: null, monitored: false }; // Choice 1: Automatic
    }
    return await openEpisodeSelectionModal(sonarrItem, season);
}

async function openEpisodeSelectionModal(sonarrItem: any, seasonNumber: number) {

    return new Promise((resolve, reject) => {
        createModal(EpisodeSelectionDialog, {
            header: 'Episode Selection Mode',
            body: 'Some episodes of this season might not be released yet, or some may already be downloaded. Do you want to automatically monitor all episodes, or choose which ones to download manually?',
            automaticSelection: async () => {
                try {
                    modalStack.closeTopmost();
                    resolve({ sonarrItem, season: seasonNumber, episode: null, monitored: true });
                } catch (error) {
                    reject(error);
                }
            },
            manualSelection: async () => {
                modalStack.closeTopmost();
                const selected = await selectEpisodeManually(sonarrItem, seasonNumber);
                resolve({ sonarrItem, season: seasonNumber, episode: selected.episodeNumber, monitored: true });
            }
        });
    });
}

async function selectEpisodeManually(sonarrItem: any, seasonNumber: number) {
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, seasonNumber);

    const formattedEpisodes = episodes.map(episode => ({
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        hasFile: episode.hasFile,
        airDate: episode.airDate
    }));

    const selectedEpisode = writable(null);

    return new Promise((resolve, reject) => {
        createModal(SelectEpisode, {
            episodes: writable(formattedEpisodes),
            selectedEpisode,
            onConfirm: async (selected) => {
                if (selected !== null) {
                    try {
                        resolve(selected);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject('No episode selected');
                }
            },
            onCancel: () => {
                reject('Modal was canceled');
            }
        });
    });
}