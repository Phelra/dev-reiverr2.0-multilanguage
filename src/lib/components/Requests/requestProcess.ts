import { reiverrApi } from '../../apis/reiverr/reiverr-api';
import { generalSettings } from '../../stores/generalSettings.store';
import { createModal, modalStack } from '../Modal/modal.store';
import ConfirmDialog from '../Dialog/ConfirmDialog.svelte';
import { writable, get } from 'svelte/store';
import { createSerieRequest, createSerieRequestApprouved } from '../Requests/requestCreation';
import { getOrAddSeriesToSonarr } from '../MediaManagerAuto/addSerieToSonarrAutomatically';
import { searchSeriesMedia } from '../MediaManagerAuto/searchMedia';
import { SelectSeasonAndEpisode } from '../SeriesPage/SelectSeasonAndEpisode';
import { tmdbApi } from '../../apis/tmdb/tmdb-api';
import { handleMovieDownload } from '../MediaManagerAuto/AutoDownloadManagerMovie';
import SpinnerModal from '../SpinnerModal.svelte';
import { createMovieApprovedRequest, createMovieRequest } from './requestCreation';
import { getOrAddMovieToRadarr } from '../MediaManagerAuto/addMovieToRadarrAutomatically';

//Movie

export async function handleMediaRequest(
  type: 'movie' | 'serie',
  tmdbData: any,
  currentUser: any,
  onRequestCreated?: (season?: number, episode?: number) => void,
  requestedSeasons?: any
) {
  try {
    if (type === 'movie') {
      // Movie
      await checkQuotaAndCreateRequest(type, tmdbData, currentUser, onRequestCreated);
    } else if (type === 'serie') {
      // Serie
      const sonarrItem = await getOrAddSeriesToSonarr(
        tmdbData.id,
        tmdbData.name,
        () => console.log('Series added successfully.')
      );

      if (!sonarrItem) {
        console.error('Failed to process series in Sonarr.');
        return;
      }

      const userSelection = await SelectSeasonAndEpisode(sonarrItem, requestedSeasons);
      await checkQuotaAndCreateRequest(
        type,
        sonarrItem,
        currentUser,
        onRequestCreated,
        userSelection.season,
        userSelection.episode,
        userSelection.monitored
      );
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }
  } catch (error) {
    const errorMessage = type === 'movie'
      ? 'Error handling movie request'
      : 'Error handling series request';

    createErrorDialog(errorMessage, () =>
      handleMediaRequest(type, tmdbData, currentUser, onRequestCreated, requestedSeasons)
    );
  }
}

async function handleMovieDownloadWithModal(
  movie: any,
  currentUser: any
) {
  const loadingMessage = writable("");
  createModal(SpinnerModal, {
    title: 'Processing Movie Download',
    progressMessage: loadingMessage,
  });

  try {
    loadingMessage.set('(1/2) Search movie in library');
    const radarrItem = await getOrAddMovieToRadarr(movie.id, movie.title);

    if (!radarrItem || !radarrItem.id) {
      throw new Error('Radarr item not found');
    }

    await handleMovieDownload(
      radarrItem.id,
      (message) => loadingMessage.set(message),
      (error) =>
        createErrorDialog('Error during download process', () =>
          handleMovieDownloadWithModal(movie, currentUser)
        )
    );

    const result = await createMovieApprovedRequest(currentUser, movie.id, 0);
    if (result.success) {
      loadingMessage.set('Process completed');
      setTimeout(() => modalStack.closeTopmost(), 1000);
    } else {
      throw new Error('Request creation failed');
    }
  } catch (error) {
    createErrorDialog(error.message || 'Unknown error', () =>
      handleMovieDownloadWithModal(movie, currentUser)
    );
  } finally {
    setTimeout(() => modalStack.closeTopmost(), 1000);
  }
}

//Episode serie 

export async function handleRequestEpisode(tmdbId: string, season: number, episode: number, currentUser: any) {
  try {
    const tmdbSeries = await tmdbApi.getTmdbSeries(Number(tmdbId));
    const sonarrItem = await getOrAddSeriesToSonarr(
      tmdbSeries.id,
      tmdbSeries.name,
      () => console.log('Series added successfully.')
    );

    if (!sonarrItem) {
      console.error('Failed to process series in Sonarr.');
      return;
    }

    await checkQuotaAndCreateRequest(
      "serie",
      sonarrItem,
      currentUser,
      (season, episode) => { console.log(`Request created successfully for season ${season}, episode ${episode}`); },
      Number(season),
      episode,
      false
    );
  } catch (error) {
    console.error('Error handling request for episode:', error);
  }
}

//shared

function createPendingRequestDialog(
  type: "movie" | "serie",
  item: any,
  currentUser: any,
  onRequestCreated?: (season?: number, episode?: number) => void,
  options?: {
    season?: number;
    episode?: number;
  }
) {
  let bodyMessage: string;
  const { season, episode } = options || {};

  if (type === "movie") {
    bodyMessage = `Do you want to request this movie? An administrator must approve it.`;
  } else if (type === "serie") {
    const episodeMessage = episode ? `, episode ${episode}` : '';
    bodyMessage = `Do you want to request season ${season}${episodeMessage}? An administrator must approve it before it appears in the library.`;
  } else {
    console.error(`Unsupported type: ${type}`);
    return;
  }

  createModal(ConfirmDialog, {
    header: 'Confirm Request',
    body: bodyMessage,
    confirm: async () => {
      try {
        if (type === "movie") {
          await createMovieRequest(item.id, currentUser);
          if (onRequestCreated) {
            onRequestCreated();
          }
        } else if (type === "serie") {
          await createSerieRequest(item.id, currentUser, season, episode);
          if (onRequestCreated) {
            onRequestCreated(season, episode);
          }
        }
      } catch (error) {
        console.error(`Error handling ${type} request:`, error);
      }
    },
  });
}

async function checkQuotaAndCreateRequest(
  type: "serie" | "movie",
  item: any, 
  currentUser: any,
  onRequestCreated?: (season?: number, episode?: number) => void,
  season?: number, 
  episode?: number, 
  monitored?: boolean
) {

  const settings = get(generalSettings);
  const requests = settings.data?.requests;
  const days = requests?.delayInDays ?? 7;
  const maxRequests = type === "serie" ? requests?.defaultLimitTV ?? 0 : requests?.defaultLimitMovies ?? 0;
  const userRequestCount = (await reiverrApi.countRequestsInPeriodForUser(currentUser?.id, days)) ?? 0;
  const remainingRequests = Math.max(0, maxRequests - userRequestCount);
  const approvalMethod = requests?.approvalMethod ?? 0;
  const setLimit = requests?.setLimit ?? false;
  const canAutoApprove = currentUser?.isAdmin || approvalMethod === 1 || (remainingRequests > 0 && approvalMethod === 0 && setLimit);

  if (canAutoApprove) {
    createApprovedRequestDialog(
      type,
      item,
      remainingRequests,
      days,
      maxRequests,
      approvalMethod,
      currentUser,
      { season, monitored, episode }
    );
  } else {
    createPendingRequestDialog(type, item, currentUser, onRequestCreated, { season, episode });
  }
}

function createApprovedRequestDialog(
  type: 'movie' | 'serie',
  item: any,
  remainingRequests: number,
  days: number,
  maxRequests: number,
  approvalMethod: number,
  currentUser: any,
  options?: { season?: number; monitored?: boolean; episode?: number }
) {
  let bodyMessage = '';

  if (currentUser?.isAdmin) {
    bodyMessage = `As an administrator, you can approve this download without any limitations.`;
  } else if (approvalMethod === 1) {
    bodyMessage = `Your request will be automatically approved, and the media search will begin.`;
  } else if (remainingRequests > 0 && approvalMethod === 0) {
    bodyMessage = `You have ${remainingRequests}/${maxRequests} requests remaining that will be automatically approved. Requests reset every ${days} days.`;
  } else {
    bodyMessage = `You have reached your limit of ${maxRequests} requests. Requests reset every ${days} days. Further requests will require admin approval.`;
  }

  createModal(ConfirmDialog, {
    header: 'Confirm Automatic Search',
    body: bodyMessage,
    confirm: async () => {
      try {
        if (type === 'movie') {
          // Manage movies
          await handleMovieDownloadWithModal(item, currentUser);
        } else if (type === 'serie') {
          // Manage series
          const { season, monitored, episode } = options || {};
          const success = await searchSeriesMedia(item, season, monitored, episode, true);
          if (success) {
            await createSerieRequestApprouved(item.tmdbId, currentUser, season, episode);
          }
        }
      } catch (error) {
        console.error(type === 'movie' ? 'Error during movie processing:' : 'Error while searching or downloading:', error);
        createErrorDialog(error.message || 'Unknown error', () =>
          createApprovedRequestDialog(
            type,
            item,
            remainingRequests,
            days,
            maxRequests,
            approvalMethod,
            currentUser,
            options
          )
        );
      }
    },
  });
}

function createErrorDialog(error: string, retryCallback: () => void) {
  createModal(ConfirmDialog, {
    header: 'Error Occurred',
    body: `An error occurred: ${error}. Do you want to retry?`,
    confirm: () => {
      modalStack.closeTopmost();
      retryCallback();
    },
    cancel: () => modalStack.closeTopmost(),
  });
}