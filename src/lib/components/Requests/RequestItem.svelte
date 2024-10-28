<script lang="ts">
  import Container from '../../../Container.svelte';
  import Button from '../Button.svelte';
  import { writable } from 'svelte/store';
  import { Check, Cross1, EyeOpen, CountdownTimer } from 'radix-icons-svelte';
  import { user } from '../../stores/user.store';
  import { navigate } from '../StackRouter/StackRouter';
  import { formatTimeAgo } from '../../utils';
  import { scrollIntoView } from '../../selectable';
  import { handleMovieDownload } from '../MediaManagerAuto/AutoDownloadManagerMovie';
  import { handleSeriesDownload } from '../MediaManagerAuto/AutoDownloadManagerSerie';
  import { getOrAddSeriesToSonarr } from '../MediaManagerAuto/addSerieToSonarrAutomatically';
  import { getOrAddMovieToRadarr } from '../MediaManagerAuto/addMovieToRadarrAutomatically';
  import { requestsStore } from '../../stores/requests.store';

  import type { RequestDto } from '../../apis/reiverr/reiverr-api';

  export let request: RequestDto;

  let requestStatus = writable(request.status);
  let connectedUser = $user;
  let loadingMessage = writable('');

  let mediaDetails = {};
  let userDetails = {};
  
  requestsStore.mediaDetails.subscribe(details => {
    mediaDetails = details[request.id] || {};
  });

  requestsStore.userDetails.subscribe(details => {
    userDetails = details[request.id] || {};
  });

  function setLoadingMessage(step: string) {
    loadingMessage.set(step);
  }

  function handleError(message: string) {
    console.error(message);
    loadingMessage.set(message);
    setTimeout(() => {
      loadingMessage.set('');
    }, 10000);
  }

  async function updateRequestStatus(status: 'Approved' | 'Declined') {
    try {
      if (status === 'Approved') {
        if (request.media_type === 0) {
          setLoadingMessage('(0/2) Searching for the movie in the library');
          const radarrItem = await getOrAddMovieToRadarr(
            request.media_id,
            mediaDetails.title || 'Unknown',
            () => console.log(`Movie ${mediaDetails.title} successfully added to Radarr`)
          );

          if (radarrItem) {
            await handleMovieDownload(radarrItem.id, setLoadingMessage, handleError);
          } else {
            handleError('Failed to add or retrieve the movie from Radarr');
            throw new Error('Failed to add or retrieve the movie from Radarr');
          }

        } else if (request.media_type === 1 && request.season !== null) {
          setLoadingMessage('(0/2) Searching for the series in the library');
          const sonarrItem = await getOrAddSeriesToSonarr(
            request.media_id,
            mediaDetails.title || 'Unknown',
            () => console.log(`Series ${mediaDetails.title} successfully added to Sonarr`)
          );

          if (sonarrItem) {
            await handleSeriesDownload(sonarrItem.id, request.season, setLoadingMessage, handleError);
          } else {
            handleError('Failed to add or retrieve the series from Sonarr');
            throw new Error('Failed to add or retrieve the series from Sonarr');
          }

        } else {
          handleError('Invalid media type or missing season for the series');
          throw new Error('Invalid media type or missing season for the series');
        }
      }

      await requestsStore.updateRequestStatus(request.id, status);
      requestStatus.set(status);
      loadingMessage.set('');

    } catch (error) {
      handleError(`Error: ${(error as Error).message}`);
      return;
    }
  }

  async function deleteRequest() {
    try {
      await requestsStore.deleteRequest(request.id);
    } catch (error) {
      handleError(`Error deleting request: ${(error as Error).message}`);
    }
  }

  function viewMediaPage() {
    if (request.media_type === 0) {
      navigate(`/movie/${request.media_id}`);
    } else if (request.media_type === 1) {
      navigate(`/series/${request.media_id}`);
    } else {
      console.error(`Unknown media type: ${request.media_type}`);
    }
  }
</script>

<Container class="bg-primary-800 rounded-lg mb-4 p-4 flex flex-col md:flex-row items-center md:items-center">

  <div class="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
    {#if mediaDetails.posterUrl}
      <img
        on:click={viewMediaPage}
        src={mediaDetails.posterUrl}
        alt="Media poster"
        class="object-cover rounded-lg shadow-lg"
        width="100"
        height="150"
      />
    {:else}
      <div class="loading-placeholder poster-placeholder"></div>
    {/if}
  </div>

  <div class="mb-4 md:mb-0" style="flex: 3; display: flex; flex-direction: column; justify-content: center;">
    {#if mediaDetails.releaseYear}
      <p class="release-date text-secondary-400">{mediaDetails.releaseYear}</p>
    {:else}
      <div class="loading-placeholder release-date-placeholder mb-2"></div>
    {/if}
    {#if mediaDetails.title}
      <h3 class="movie-title font-bold text-lg">{mediaDetails.title}</h3>
    {:else}
      <div class="loading-placeholder movie-title-placeholder mb-2"></div>
    {/if}
    {#if request.media_type === 1 && request.season !== null}
      {#if request.episode !== undefined && request.episode !== null}
        <p class="season">S{request.season.toString().padStart(2, '0')}E{request.episode.toString().padStart(2, '0')}</p>
      {:else}
        <p class="season">Season {request.season}</p>
      {/if}
    {/if}
  </div>

  <div class="mb-4 md:mb-0 md:ml-auto" style="flex: 2;">
    <div class="status-container flex items-center gap-2 mb-2">
      <div class="status-label text-secondary-400">Status</div>
      <div
        class="status-box"
        style="border-radius: 20px; font-size: 0.75rem; padding: 0.25rem 0.5rem; color: white;"
        class:approved={$requestStatus === 'Approved'}
        class:declined={$requestStatus === 'Declined'}
        class:pending={$requestStatus === 'Pending'}
      >
        {$requestStatus}
      </div>
    </div>
    <p class="requested text-secondary-400">Requested {formatTimeAgo(new Date(request.created_at))}</p>
    {#if connectedUser?.isAdmin}
      <div class="user-info flex items-center gap-2 mt-2">
        <p class="by text-secondary-400">by</p>
        {#if userDetails.profilePicture}
          <img src={userDetails.profilePicture} alt="Profile picture" class="user-picture w-6 h-6 rounded-full object-cover" />
        {:else}
          <div class="loading-placeholder user-picture-placeholder w-6 h-6 rounded-full object-cover"></div>
        {/if}
        {#if userDetails.userName}
          <p class="user-name text-secondary-400">{userDetails.userName}</p>
        {:else}
          <div class="loading-placeholder user-name-placeholder"></div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex-shrink-0 flex flex-col space-y-4 w-full pl-3" style="flex: 2;">
    {#if $loadingMessage}
      <p class="items-center text-primary-500">{$loadingMessage}</p>
    {:else}
      {#if connectedUser?.isAdmin}
        {#if $requestStatus !== 'Approved' && $requestStatus !== 'Declined'}
          <Button
            class="buttonRequest small-button w-full same-size-button"
            type="primary-dark"
            on:clickOrSelect={() => updateRequestStatus('Approved')}
            on:enter={scrollIntoView({ vertical: 128 })}
            icon={Check}
          >
            Approve
          </Button>
          <Button
            class="buttonRequest small-button w-full same-size-button"
            type="primary-dark"
            on:clickOrSelect={() => updateRequestStatus('Declined')}
            on:enter={scrollIntoView({ vertical: 128 })}
            icon={Cross1}
          >
            Decline
          </Button>
        {/if}
        {#if $requestStatus === 'Approved' || $requestStatus === 'Declined'}
          {#if $requestStatus === 'Declined'}
            <Button
              class="buttonRequest small-button w-full same-size-button"
              type="primary-dark"
              on:clickOrSelect={() => updateRequestStatus('Approved')}
              on:enter={scrollIntoView({ vertical: 128 })}
              icon={CountdownTimer}
            >
              Cancel
            </Button>
          {/if}
          {#if $requestStatus === 'Approved'}
            <Button
              class="small-button w-full same-size-button"
              type="primary-dark"
              on:clickOrSelect={viewMediaPage}
              on:enter={scrollIntoView({ vertical: 128 })}
              icon={EyeOpen}
            >
              View Media Page
            </Button>
          {/if}
          <Button
            class="small-button w-full same-size-button"
            type="primary-dark"
            on:clickOrSelect={deleteRequest}
            on:enter={scrollIntoView({ vertical: 128 })}
            icon={Cross1}
          >
            Delete
          </Button>
        {/if}
      {:else}
        <Button
          class="small-button w-full same-size-button"
          type="primary-dark"
          on:clickOrSelect={viewMediaPage}
          on:enter={scrollIntoView({ vertical: 128 })}
          icon={EyeOpen}
        >
          View Media Page
        </Button>
        {#if $requestStatus === 'Pending'}
          <Button
            class="buttonRequest small-button w-full same-size-button"
            type="primary-dark"
            on:clickOrSelect={deleteRequest}
            on:enter={scrollIntoView({ vertical: 128 })}
            icon={Cross1}
          >
            Cancel
          </Button>
        {/if}
      {/if}
    {/if}
  </div>
</Container>

<style>
  .loading-placeholder,
  .poster-placeholder,
  .user-picture-placeholder,
  .user-name-placeholder,
  .release-date-placeholder,
  .movie-title-placeholder {
    background-color: rgb(24, 22, 16);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .status-box.approved { background-color: #29a458; border: 2px solid #22c55d; }
  .status-box.declined { background-color: #bd2c2c; border: 2px solid #ef4444; }
  .status-box.pending { background-color: #c69921; border: 2px solid #ebb20c; }
</style>
