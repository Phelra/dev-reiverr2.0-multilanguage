<script lang="ts">
	import Container from '../../Container.svelte';
	import { tmdbApi } from '../apis/tmdb/tmdb-api';
	import DetachedPage from '../components/DetachedPage/DetachedPage.svelte';
	import { useActionRequest } from '../stores/data.store';
	import { PLATFORM_WEB, TMDB_IMAGES_ORIGINAL } from '../constants';
	import { Check, DotFilled, ExternalLink, Play, Plus, Trash } from 'radix-icons-svelte';
	import HeroInfoTitle from '../components/HeroInfo/HeroInfoTitle.svelte';
	import Button from '../components/Button.svelte';
	import { jellyfinApi } from '../apis/jellyfin/jellyfin-api';
	import { playerState } from '../components/VideoPlayer/VideoPlayer';
	import { formatSize, retry, timeout } from '../utils';
	import { createModal, modalStack } from '../components/Modal/modal.store';
	import ButtonGhost from '../components/Ghosts/ButtonGhost.svelte';
	import {
		type EpisodeFileResource,
		sonarrApi,
		type SonarrEpisode,
		type SonarrSeries
	} from '../apis/sonarr/sonarr-api';
	import MMAddToSonarrDialog from '../components/MediaManagerModal/MMAddToSonarrDialog.svelte';
	import SonarrMediaManagerModal from '../components/MediaManagerModal/SonarrMediaManagerModal.svelte';
	import ConfirmDialog from '../components/Dialog/ConfirmDialog.svelte';
	import { tick } from 'svelte';
	import { createSerieRequest, createSerieRequestApprouved } from '../components/Requests/requestCreation';
	import SpinnerModal from '../components/SpinnerModal.svelte';
	import { getOrAddSeriesToSonarr } from '../components/MediaManagerAuto/addSerieToSonarrAutomatically';
	import { writable, get } from 'svelte/store';
	import { generalSettings } from '../stores/generalSettings.store';
	import { user } from '../stores/user.store';
	import { reiverrApi } from '../apis/reiverr/reiverr-api'; 


	export let id: string; // Series ID
	export let season: string;
	export let episode: string;
	let requestExists = false;
	let pendingRequest = false;
	let loadingMessage = writable('');
	const currentUser = get(user);

	let isWatched = false;

	const tmdbEpisode = tmdbApi.getEpisode(Number(id), Number(season), Number(episode));
	let sonarrItem = sonarrApi.getSeriesByTmdbId(Number(id));
	$: sonarrEpisode = getSonarrEpisode(sonarrItem);
	let sonarrFiles = getFiles(sonarrItem, sonarrEpisode);

	function setLoadingMessage(message: string) {
	loadingMessage.set(message);
	}

	const jellyfinSeries = jellyfinApi.getLibraryItemFromTmdbId(id);
	let jellyfinEpisode = jellyfinSeries.then((series) =>
		jellyfinApi.getEpisode(series?.Id || '', Number(season), Number(episode))
	);

	const { send: toggleMarkAs, isFetching: markAsLoading } = useActionRequest(async () => {
		const episode = await jellyfinEpisode;

		const jellyfinId = episode?.Id;
		if (!jellyfinId) return;

		if (isWatched) {
			return jellyfinApi.markAsUnwatched(jellyfinId).then((ok) => (isWatched = !ok));
		} else {
			return jellyfinApi.markAsWatched(jellyfinId).then((ok) => (isWatched = ok));
		}
	});

	jellyfinEpisode.then((e) => {
		isWatched = e?.UserData?.Played || false;
	});

	async function getSonarrEpisode(sonarrItem: Promise<SonarrSeries | undefined>) {
		return sonarrItem.then((sonarrItem) => {
			if (!sonarrItem?.id) return;

			return sonarrApi
				.getEpisodes(sonarrItem.id, Number(season))
				.then((episodes) => episodes.find((e) => e.episodeNumber === Number(episode)));
		});
	}

	async function handleRequestEpisode() {
  try {
    const tmdbSeries = await tmdbApi.getTmdbSeries(Number(id));

    const sonarrItem = await getOrAddSeriesToSonarr(
      tmdbSeries.id,
      tmdbSeries.name,
      () => console.log('Series added successfully.')
    );

    if (!sonarrItem) {
      console.error('Failed to process series in Sonarr.');
      return;
    }

    const sonarrEpisode = await getSonarrEpisode(Promise.resolve(sonarrItem));

    await checkQuotaAndCreateRequest(sonarrItem, Number(season), sonarrEpisode?.id);
  } catch (error) {
    console.error('Error handling request for episode:', error);
  }
}

async function checkQuotaAndCreateRequest(sonarrItem: SonarrSeries, season: number, episodeId?: number) {
  const userId = currentUser?.id;
  const settings = get(generalSettings);
  const days = settings.data?.requests?.delayInDays ?? 30;
  const userRequestCount = await reiverrApi.countRequestsInPeriodForUser(userId, days);
  const maxRequests = settings.data?.requests?.defaultLimitTV ?? 3;

  if (currentUser?.isAdmin || userRequestCount < maxRequests) {
    const remainingRequests = maxRequests - userRequestCount;
    createApprovedRequestDialog(remainingRequests, days, maxRequests, sonarrItem, season, episodeId);
  } else {
    createPendingRequestDialog(season, Number(episode));
  }
}

function createApprovedRequestDialog(
  remainingRequests: number,
  days: number,
  maxRequests: number,
  sonarrItem: SonarrSeries,
  season: number,
  episodeId?: number
) {
  createModal(ConfirmDialog, {
    header: 'Confirm Automatic Download',
    body: `You have ${remainingRequests}/${maxRequests} requests remaining that will be automatically approved. Requests reset every ${days} days. After reaching this limit, further requests will require admin approval.`,
    confirm: async () => {
      await automaticDownloadEpisode(sonarrItem, season, episodeId);
    }
  });
}

async function automaticDownloadEpisode(sonarrItem: SonarrSeries, season: number, episodeId?: number) {
  createModal(SpinnerModal, {
    title: 'Processing Episode Download',
    progressMessage: loadingMessage
  });
  try {
    if (episodeId) {
      await sonarrApi.monitorEpisode(episodeId);
      await sonarrApi.searchEpisode(episodeId);
      console.log(`Search initiated for episode ${episodeId} of series ${sonarrItem.id}, season ${season}.`);
    } else {
      console.error('Episode ID is missing');
      return;
    }

    await createSerieRequestApprouved(Number(id), currentUser, season, Number(episode));
    requestExists = true;
    pendingRequest = false;

    loadingMessage.set('Process completed');
    setTimeout(() => modalStack.closeTopmost(), 1000);
  } catch (error) {
    handleError(error.message || 'Failed to download the episode.');
    modalStack.closeTopmost();
    createErrorDialog(error.message, () => automaticDownloadEpisode(sonarrItem, season, episodeId));
  }
}

function createPendingRequestDialog(season: number, episode: number) {
  createModal(ConfirmDialog, {
    header: 'Confirm Request',
    body: `Do you want to request episode ${episode} of season ${season}? An administrator will have to approve it before it appears in the library.`,
    confirm: async () => {
      try {
        await createSerieRequest(Number(id), currentUser, season, episode);
        requestExists = true;
        pendingRequest = true;
      } catch (error) {
        console.error('Error confirming request creation:', error);
      }
    }
  });
}


function createErrorDialog(error: string, retryCallback: () => void) {
  const errorMessage = `An error occurred while downloading the episode: ${error} Do you want to retry downloading the episode?`;
  createModal(ConfirmDialog, {
    header: 'Download Error',
    body: errorMessage,
    confirm: () => {
      modalStack.closeTopmost();
      retryCallback();
    },
    cancel: () => {
      modalStack.closeTopmost();
    },
    confirmButtonText: 'Retry',
    cancelButtonText: 'Cancel'
  });
}

function handleError(message: string) {
  console.error(message);
  loadingMessage.set('Error occurred');
}



	function createConfirmDeleteFiles(files: EpisodeFileResource[]) {
		createModal(ConfirmDialog, {
			header: 'Delete Season Files?',
			body: `Are you sure you want to delete all ${files.length} file(s)?`,
			confirm: () =>
				sonarrApi
					.deleteSonarrEpisodes(files.map((f) => f.id || -1))
					.then(() => (sonarrFiles = getFiles(sonarrItem, sonarrEpisode)))
		});
	}

	function getFiles(
		sonarrItem: Promise<SonarrSeries | undefined>,
		sonarrEpisode: Promise<SonarrEpisode | undefined>
	) {
		return Promise.all([sonarrItem, sonarrEpisode]).then(([sonarrItem, sonarrEpisode]) => {
			if (!sonarrItem?.id) return [];
			return sonarrApi
				.getFilesBySeriesId(sonarrItem.id)
				.then((files) => files.filter((f) => sonarrEpisode?.episodeFileId === f.id));
		});
	}
</script>

<DetachedPage let:handleGoBack let:registrar>
	{#await tmdbEpisode then tmdbEpisode}
		<div
			class="bg-center bg-cover absolute inset-x-0 h-screen -z-10"
			style={`background-image: url('${TMDB_IMAGES_ORIGINAL + tmdbEpisode?.still_path}')`}
		/>
		<div class="absolute inset-0 flex flex-col -z-10">
			<div class="h-screen bg-gradient-to-b from-transparent to-secondary-900" />
			<div class="flex-1 bg-secondary-500" />
		</div>

		<!-- <HeroCarousel /> -->

		<Container
			on:back={handleGoBack}
			on:mount={registrar}
			focusOnMount
			class="h-screen flex flex-col justify-end mx-32 py-16"
		>
			<div class="mt-2 text-zinc-200 font-medium text-lg tracking-wider">
				Season {tmdbEpisode?.season_number} Episode {tmdbEpisode?.episode_number}
			</div>
			<HeroInfoTitle title={tmdbEpisode?.name} />
			<div
				class="flex items-center gap-1 uppercase text-zinc-300 font-semibold tracking-wider mt-2 text-lg"
			>
				<!--				<p class="flex-shrink-0">-->
				<!--{#if series.status !== 'Ended'}-->
				<!--	Since {new Date(series.first_air_date || Date.now())?.getFullYear()}-->
				<!--{:else}-->
				<!--	Ended {new Date(series.last_air_date || Date.now())?.getFullYear()}-->
				<!--{/if}-->
				<!--				</p>-->
				<!-- <DotFilled /> -->
				<p class="flex-shrink-0">
					<a href={'https://www.themoviedb.org/movie/' + tmdbEpisode?.id}>
						{tmdbEpisode?.vote_average} TMDB
					</a>
				</p>
				<DotFilled />
				<p class="flex-shrink-0">{tmdbEpisode?.runtime} Minutes</p>

				{#await jellyfinEpisode then episode}
					{#if episode?.MediaSources?.[0]?.Size}
						<DotFilled />
						<p class="flex-shrink-0">{formatSize(episode?.MediaSources?.[0]?.Size)}</p>
					{/if}
					{#if episode?.MediaSources?.[0]?.MediaStreams?.[0]?.DisplayTitle}
						<DotFilled />
						<p class="flex-shrink-0">
							{episode?.MediaSources?.[0]?.MediaStreams?.[0]?.DisplayTitle}
						</p>
					{/if}
				{/await}
			</div>
			<div class="text-stone-300 font-medium line-clamp-3 opacity-75 max-w-4xl mt-4">
				{tmdbEpisode?.overview}
			</div>
			<Container direction="horizontal" class="flex mt-8 space-x-4">
				{#await Promise.all([jellyfinEpisode, sonarrEpisode])}
					<ButtonGhost>Play</ButtonGhost>
					<ButtonGhost>Manage Media</ButtonGhost>
					<ButtonGhost>Delete Files</ButtonGhost>
				{:then [jellyfinEpisode]}
					{#if jellyfinEpisode?.MediaSources?.length}
						<Button
							on:clickOrSelect={() =>
								jellyfinEpisode?.Id && playerState.streamJellyfinId(jellyfinEpisode.Id)}
						>
							Play
							<Play size={19} slot="icon" />
						</Button>
						<Button disabled={$markAsLoading} on:clickOrSelect={toggleMarkAs}>
							{#if isWatched}
								Mark as Unwatched
							{:else}
								Mark as Watched
							{/if}
							<Check slot="icon" size={19} />
						</Button>
					{:else}
						<Button action={handleRequestEpisode}>
							Request
							<Plus size={19} slot="icon" />
						</Button>
					{/if}
				{/await}
				<!--				<Button-->
				<!--					on:clickOrSelect={() =>-->
				<!--						openEpisodeMediaManager(Number(id), Number(season), Number(episode))}-->
				<!--					>Manage Media <File slot="icon" size={19} /></Button-->
				<!--				>-->
				{#await sonarrFiles then files}
					{#if files?.length}
						<Button on:clickOrSelect={() => createConfirmDeleteFiles(files)}
							>Delete Files <Trash slot="icon" size={19} /></Button
						>
					{/if}
				{/await}

				{#if PLATFORM_WEB}
					<Button>
						Open In TMDB
						<ExternalLink size={19} slot="icon-after" />
					</Button>
					<Button>
						Open In Jellyfin
						<ExternalLink size={19} slot="icon-after" />
					</Button>
				{/if}
			</Container>
		</Container>
	{/await}
</DetachedPage>
