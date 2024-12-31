<script lang="ts">
	import Container from '../../Container.svelte';
	import HeroCarousel from '../components/HeroCarousel/HeroCarousel.svelte';
	import { tmdbApi } from '../apis/tmdb/tmdb-api';
	import { PLATFORM_WEB, TMDB_IMAGES_ORIGINAL } from '../constants';
	import classNames from 'classnames';
	import {
		Cross1,
		DotFilled,
		Download,
		ExternalLink,
		File,
		Play,
		Plus,
		Trash,
    Pencil2,
    Reload
	} from 'radix-icons-svelte';
	import Button from '../components/Button.svelte';
	import { jellyfinApi } from '../apis/jellyfin/jellyfin-api';
	import { type MovieDownload, type MovieFileResource, radarrApi } from '../apis/radarr/radarr-api';
	import { useActionRequests, useRequest } from '../stores/data.store';
	import DetachedPage from '../components/DetachedPage/DetachedPage.svelte';
	import { createModal, modalStack } from '../components/Modal/modal.store';
	import { playerState } from '../components/VideoPlayer/VideoPlayer';
	import { scrollIntoView } from '../selectable';
	import Carousel from '../components/Carousel/Carousel.svelte';
	import TmdbPersonCard from '../components/PersonCard/TmdbPersonCard.svelte';
	import TmdbCard from '../components/Card/TmdbCard.svelte';
	import MovieMediaManagerModal from '../components/MediaManagerModal/RadarrMediaManagerModal.svelte';
	import MMAddToRadarrDialog from '../components/MediaManagerModal/MMAddToRadarrDialog.svelte';
	import FileDetailsDialog from '../components/SeriesPage/FileDetailsDialog.svelte';
	import DownloadDetailsDialog from '../components/SeriesPage/DownloadDetailsDialog.svelte';
	import { capitalize, formatSize } from '../utils';
	import ConfirmDialog from '../components/Dialog/ConfirmDialog.svelte';
	import { TMDB_BACKDROP_SMALL } from '../constants.js';
  import MMEditToRadarrDialog from '../components/MediaManagerModal/MMEditToRadarrDialog.svelte';
  import { reiverrApi } from '../apis/reiverr/reiverr-api'; 
  import { user } from '../stores/user.store';  
  import { generalSettings } from '../stores/generalSettings.store';
  import { writable, get } from 'svelte/store';
  import { getOrAddMovieToRadarr } from '../components/MediaManagerAuto/addMovieToRadarrAutomatically';
  import { handleMediaRequest } from '../components/Requests/requestProcess';

  export let id: string;
  const tmdbId = Number(id);
  const currentUser = get(user);

  $: recommendations = tmdbApi.getMovieRecommendations(tmdbId);
  $: collection = tmdbMovie.then(movie => movie?.belongs_to_collection ? tmdbApi.getCollection(movie.belongs_to_collection.id) : null); //rajouter
  $: allowRequests = $generalSettings?.data?.requests?.allowRequests ?? true;

  let requestExists = writable(false);
  let pendingRequest = writable(false);

  const { promise: tmdbMovies, data: tmdbMovieData } = useRequest(
		tmdbApi.getTmdbMovie,
		Number(id)
	);

  const tmdbMovie = tmdbApi.getTmdbMovie(tmdbId);
  const { promise: jellyfinItemP } = useRequest(
      (id: string) => jellyfinApi.getLibraryItemFromTmdbId(id),
      id
  );
  const { promise: radarrItemP, send: refreshRadarrItem } = useRequest(
      radarrApi.getMovieByTmdbId,
      tmdbId
  );

  let radarrItem = radarrApi.getMovieByTmdbId(tmdbId);
  $: radarrDownloads = getDownloads(radarrItem);
  $: radarrFiles = getFiles(radarrItem);

async function checkRequests() {
  try {
    const existingRequests = (await reiverrApi.getRequestsByMediaId(tmdbId)) || [];

    if (Array.isArray(existingRequests)) {
      const hasRequests = existingRequests.length > 0;
      const hasPendingRequests = existingRequests.some(request => request.status === 'Pending');

      requestExists.set(hasRequests);
      pendingRequest.set(hasPendingRequests);
    } else {
      throw new Error('Expected an array for existingRequests');
    }
  } catch (error) {
    createErrorDialog('Error fetching existing requests', checkRequests);
  }
}
  checkRequests();

  async function getFiles(item: typeof radarrItem) {
    return item.then((item) => (item ? radarrApi.getFilesByMovieId(item?.id || -1) : []));
  }

  async function getDownloads(item: typeof radarrItem) {
    return item.then((item) => (item ? radarrApi.getDownloadsById(item?.id || -1) : []));
  }

  function createErrorDialog(error: string, retryCallback: () => void) {
    createModal(ConfirmDialog, {
        header: 'Error Occurred',
        body: `An error occurred: ${error}. Do you want to retry?`,
        confirm: () => {
            modalStack.closeTopmost();
            retryCallback();
        },
        cancel: () => modalStack.closeTopmost()
    });
}

  function createConfirmDeleteSeasonDialog(files: MovieFileResource[]) {
    createModal(ConfirmDialog, {
      header: 'Delete Season Files?',
      body: `Are you sure you want to delete all ${files.length} file(s)?`,
      confirm: () =>
        radarrApi
          .deleteFiles(files.map((f) => f.id || -1))
          .then(() => (radarrFiles = getFiles(radarrItem)))
    });
  }

  function createConfirmCancelDownloadsDialog(downloads: MovieDownload[]) {
    createModal(ConfirmDialog, {
      header: 'Cancel Season Downloads?',
      body: `Are you sure you want to cancel all ${downloads.length} download(s)?`,
      confirm: () =>
        radarrApi
          .cancelDownloads(downloads.map((f) => f.id || -1))
          .then(() => (radarrDownloads = getDownloads(radarrItem)))
    });
  }

const onGrabRelease = () => setTimeout(() => (radarrDownloads = getDownloads(radarrItem)), 8000);

async function editRadarrParameters() {
    try {
        const [tmdbMovieData, radarrItemData] = await Promise.all([tmdbMovie, radarrItem]);

        if (!radarrItemData?.id) {
            throw new Error("The movie does not exist in Radarr.");
        }

        createModal(MMEditToRadarrDialog, {
            title: tmdbMovieData?.title || '',
            radarrItem: radarrItemData,
            backdropUri: tmdbMovieData?.backdrop_path || ''
        });
    } catch (error) {
        createErrorDialog('Error while editing Radarr parameters', editRadarrParameters);
    }
}

async function downloadManually() {
    try {
        let radarrItemData = await radarrItemP;

        if (!radarrItemData || !radarrItemData.id) {
            radarrItemData = await getOrAddMovieToRadarr(tmdbId, tmdbMovie.title);
        }

        if (radarrItemData && radarrItemData.id) {
            createModal(MovieMediaManagerModal, { radarrItem: radarrItemData, onGrabRelease });
        } else {
            throw new Error('Radarr item is invalid or missing ID.');
        }
    } catch (error) {
        console.error('Error during manual download:', error);
        createErrorDialog('Error during manual download', downloadManually);
    }
}
</script>

<DetachedPage let:handleGoBack let:registrar>
	<div class="relative">
		<Container
			class="h-[calc(100vh-4rem)] flex flex-col py-16 px-32"
			on:enter={scrollIntoView({ top: 999 })}
		>
			<HeroCarousel
				urls={tmdbMovie.then(
					(movie) =>
						movie?.images.backdrops
							?.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
							?.map((bd) => TMDB_IMAGES_ORIGINAL + bd.file_path || '')
							.slice(0, 5) || []
				)}
			>
				<Container />
				<div class="h-full flex-1 flex flex-col justify-end">
					{#await tmdbMovie then movie}
						{#if movie}
							<div
								class={classNames(
									'text-left font-medium tracking-wider text-stone-200 hover:text-amber-200 mt-2',
									{
										'text-4xl sm:text-5xl 2xl:text-6xl': movie.title?.length || 0 < 15,
										'text-3xl sm:text-4xl 2xl:text-5xl': movie?.title?.length || 0 >= 15
									}
								)}
							>
								{movie?.title}
							</div>
							<div
								class="flex items-center gap-1 uppercase text-zinc-300 font-semibold tracking-wider mt-2 text-lg"
							>
								<p class="flex-shrink-0">
									{new Date(movie.release_date || Date.now())?.getFullYear()}
								</p>
								<!-- <DotFilled />
								<p class="flex-shrink-0">{movie.runtime}</p> -->
								<DotFilled />
								<p class="flex-shrink-0">
									<a href={'https://www.themoviedb.org/movie/' + movie.id}
										>{movie.vote_average?.toFixed(1)} TMDB</a
									>
								</p>
                {#if $pendingRequest}
                <div class="py-0.10 px-3 rounded-lg" style="color: white; background-color: #ffa500; border-radius: 20px; display: inline-block; font-size: 0.75rem;">
                  Requested
                </div>
                {/if}
							</div>
							<div class="text-stone-300 font-medium line-clamp-3 opacity-75 max-w-4xl mt-4">
								{movie.overview}
							</div>
						{/if}
					{/await}
					{#await Promise.all([$jellyfinItemP, $radarrItemP]) then [jellyfinItem, radarrItem]}
						<Container
							direction="horizontal"
							class="flex mt-8"
							focusOnMount
							on:back={handleGoBack}
							on:mount={registrar}
						>
							{#if jellyfinItem}
								<Button
									class="mr-4"
									on:clickOrSelect={() =>
										jellyfinItem.Id && playerState.streamJellyfinId(jellyfinItem.Id)}
								>
									Play
									<Play size={19} slot="icon" />
								</Button>
							{/if}
							{#if !$requestExists && !jellyfinItem}
              <Button class="mr-4" on:clickOrSelect={() => handleMediaRequest("movie",$tmdbMovieData, currentUser, checkRequests)} disabled={!allowRequests}>
                Request
                <Plus size={19} slot="icon" />
              </Button>              
              {/if}
              {#if currentUser?.isAdmin && radarrItem}
                <Button class="mr-4" on:clickOrSelect={editRadarrParameters} disabled={!allowRequests}>
                  Edit
                  <Pencil2 size={19} slot="icon" />
                </Button>
              {/if}
              {#if currentUser?.isAdmin && radarrItem}
                <Button class="mr-4" on:clickOrSelect={downloadManually} disabled={!allowRequests}>
                  Search Manually
                  <Reload size={19} slot="icon" />
                </Button>
              {/if}
							<!--{#if radarrItem}-->
							<!--	<Button class="mr-4" on:clickOrSelect={() => openMovieMediaManager(Number(id))}>-->
							<!--		{#if jellyfinItem}-->
							<!--			Manage Media-->
							<!--		{:else}-->
							<!--			Request-->
							<!--		{/if}-->
							<!--		<svelte:component this={jellyfinItem ? File : Download} size={19} slot="icon" />-->
							<!--	</Button>-->
							<!--{:else}-->
							<!--	<Button-->
							<!--		class="mr-4"-->
							<!--		on:clickOrSelect={() => requests.handleAddToRadarr(Number(id))}-->
							<!--		disabled={$isFetching.handleAddToRadarr}-->
							<!--	>-->
							<!--		Add to Radarr-->
							<!--		<Plus slot="icon" size={19} />-->
							<!--	</Button>-->
							<!--{/if}-->
							{#if PLATFORM_WEB}
								<Button class="mr-4">
									Open In TMDB
									<ExternalLink size={19} slot="icon-after" />
								</Button>
								<Button class="mr-4">
									Open In Jellyfin
									<ExternalLink size={19} slot="icon-after" />
								</Button>
							{/if}
						</Container>
					{/await}
				</div>
			</HeroCarousel>
		</Container>
		<Container on:enter={scrollIntoView({ top: 0 })} class="">
			{#await tmdbMovie then movie}
				<Carousel scrollClass="px-32" class="mb-8">
					<div slot="header">Show Cast</div>
					{#each movie?.credits?.cast?.slice(0, 15) || [] as credit}
						<TmdbPersonCard on:enter={scrollIntoView({ horizontal: 128 })} tmdbCredit={credit} />
					{/each}
				</Carousel>
			{/await}
			{#await recommendations then recommendations}
				<Carousel scrollClass="px-32" class="mb-8">
					<div slot="header">Recommendations</div>
					{#each recommendations || [] as recommendation}
						<TmdbCard item={recommendation} on:enter={scrollIntoView({ horizontal: 128 })} />
					{/each}
				</Carousel>
			{/await}
      {#await collection then collectionData}
      {#if collectionData}
        <Carousel scrollClass="px-32" class="mb-8">
          <div slot="header">{collectionData.name}</div>
          {#each collectionData.parts as part}
            <TmdbCard item={part} on:enter={scrollIntoView({ horizontal: 128 })} />
          {/each}
        </Carousel>
      {/if}
    {/await}
		</Container>
		{#await tmdbMovie then movie}
			<Container class="flex-1 bg-secondary-950 pt-8 px-32" on:enter={scrollIntoView({ top: 0 })}>
				<h1 class="font-medium tracking-wide text-2xl text-zinc-300 mb-8">More Information</h1>
				<div class="text-zinc-300 font-medium text-lg flex flex-wrap">
					<div class="flex-1">
						<div class="mb-8">
							<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Directed By</h2>
							<div>
								{movie?.credits.crew
									?.filter((c) => c.job === 'Director')
									?.map((c) => c.name)
									.join(', ')}
							</div>
						</div>
						<div class="mb-8">
							<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Written By</h2>
							<div>
								{movie?.credits.crew
									?.filter((c) => c.job === 'Writer')
									?.map((c) => c.name)
									.join(', ')}
							</div>
						</div>
					</div>
					<div class="flex-1">
						<div class="mb-8">
							<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Languages</h2>
							<div>
								{movie?.spoken_languages?.map((language) => language.name).join(', ')}
							</div>
						</div>
						<div class="mb-8">
							<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Release Date</h2>
							<div>
								{new Date(movie?.release_date || 0).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								})}
							</div>
						</div>
					</div>
				</div>
			</Container>
		{/await}
		{#await Promise.all([tmdbMovie, radarrFiles, radarrDownloads]) then [movie, files, downloads]}
			{#if files?.length || downloads?.length}
				<Container
					class="flex-1 bg-secondary-950 pt-8 pb-16 px-32 flex flex-col"
					on:enter={scrollIntoView({ top: 32 })}
				>
					<h1 class="font-medium tracking-wide text-2xl text-zinc-300 mb-8">Local Files</h1>
					<div class="space-y-8">
						<Container direction="grid" gridCols={2} class="grid grid-cols-2 gap-8">
							{#each downloads as download}
								<Container
									class={classNames(
										'flex space-x-8 items-center text-zinc-300 font-medium relative overflow-hidden',
										'px-8 py-4 border-2 border-transparent rounded-xl',
										{
											'bg-secondary-800 focus-within:bg-primary-700 focus-within:border-primary-500': true,
											'hover:bg-primary-700 hover:border-primary-500 cursor-pointer': true
											// 'bg-primary-700 focus-within:border-primary-500': selected,
											// 'bg-secondary-800 focus-within:border-zinc-300': !selected
										}
									)}
									on:clickOrSelect={() =>
										modalStack.create(DownloadDetailsDialog, {
											download,
											title: movie?.title || '',
											subtitle: download.title || '',
											backgroundUrl: TMDB_BACKDROP_SMALL + movie?.backdrop_path || '',
											onCancel: () => (radarrDownloads = getDownloads(radarrItem))
										})}
									on:enter={scrollIntoView({ vertical: 128 })}
									focusOnClick
								>
									<div
										class="absolute inset-0 bg-secondary-50/10"
										style={`width: ${
											(((download.size || 0) - (download.sizeleft || 0)) / (download.size || 1)) *
											100
										}%`}
									/>
									<div class="flex-1">
										<h1 class="text-lg">
											{capitalize(download.status || movie?.title || '')}
										</h1>
									</div>

									<div>
										{formatSize((download?.size || 0) - (download?.sizeleft || 1))} / {formatSize(
											download?.size || 0
										)}
									</div>
									<div>
										{download?.quality?.quality?.name}
									</div>
								</Container>
							{/each}
							{#each files as file}
								<Container
									class={classNames(
										'flex space-x-8 items-center text-zinc-300 font-medium relative overflow-hidden',
										'px-8 py-4 border-2 border-transparent rounded-xl',
										{
											'bg-secondary-800 focus-within:bg-primary-700 focus-within:border-primary-500': true,
											'hover:bg-primary-700 hover:border-primary-500 cursor-pointer': true
											// 'bg-primary-700 focus-within:border-primary-500': selected,
											// 'bg-secondary-800 focus-within:border-zinc-300': !selected
										}
									)}
									on:clickOrSelect={() =>
										modalStack.create(FileDetailsDialog, {
											file,
											title: movie?.title || '',
											subtitle: file.relativePath || '',
											backgroundUrl: TMDB_BACKDROP_SMALL + movie?.backdrop_path || '',
											onDelete: () => (radarrFiles = getFiles(radarrItem))
										})}
									on:enter={scrollIntoView({ vertical: 128 })}
									focusOnClick
								>
									<div class="flex-1">
										<h1 class="text-lg">
											{file?.quality?.quality?.name}
										</h1>
									</div>
									<div>
										{file?.mediaInfo?.runTime}
									</div>
									<div>
										{formatSize(file?.size || 0)}
									</div>
								</Container>
							{/each}
						</Container>
						<Container direction="horizontal" class="flex mt-0">
							{#if files?.length}
								<Button on:clickOrSelect={() => createConfirmDeleteSeasonDialog(files)}>
									<Trash size={19} slot="icon" />
									Delete All Files
								</Button>
							{/if}
							{#if downloads?.length}
								<Button on:clickOrSelect={() => createConfirmCancelDownloadsDialog(downloads)}>
									<Cross1 size={19} slot="icon" />
									Cancel All Downloads
								</Button>
							{/if}
						</Container>
					</div>
				</Container>
			{/if}
		{/await}
	</div>
</DetachedPage>
