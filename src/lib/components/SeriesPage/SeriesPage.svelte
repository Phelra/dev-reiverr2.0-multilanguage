<script lang="ts">
	import Container from '../../../Container.svelte';
	import HeroCarousel from '../HeroCarousel/HeroCarousel.svelte';
	import DetachedPage from '../DetachedPage/DetachedPage.svelte';
	import ScrollHelper from '../ScrollHelper.svelte';
	import Carousel from '../Carousel/Carousel.svelte';
	import TmdbPersonCard from '../PersonCard/TmdbPersonCard.svelte';
	import TmdbCard from '../Card/TmdbCard.svelte';
	import EpisodeGrid from './EpisodeGrid.svelte';
	import Button from '../Button.svelte';
	import { useRequest } from '../../stores/data.store';
	import { tmdbApi } from '../../apis/tmdb/tmdb-api';
	import { PLATFORM_WEB, TMDB_IMAGES_ORIGINAL } from '../../constants';
	import classNames from 'classnames';
	import { Cross1, DotFilled, ExternalLink, Play, Plus, Trash } from 'radix-icons-svelte';
	import { jellyfinApi } from '../../apis/jellyfin/jellyfin-api';
	import {
		type EpisodeDownload,
		type EpisodeFileResource,
		sonarrApi
	} from '../../apis/sonarr/sonarr-api';
	import { playerState } from '../VideoPlayer/VideoPlayer';
	import { createModal, modalStack } from '../Modal/modal.store';
	import { get, writable } from 'svelte/store';
	import { scrollIntoView, useRegistrar } from '../../selectable';
	import FileDetailsDialog from './FileDetailsDialog.svelte';
	import ConfirmDialog from '../Dialog/ConfirmDialog.svelte';
	import EpisodeSelectionDialog from '../Dialog/EpisodeSelectionDialog.svelte';
	import DownloadDetailsDialog from './DownloadDetailsDialog.svelte';
	import { user } from '../../stores/user.store';
	import SpinnerModal from '../SpinnerModal.svelte';
	import SelectSeason from './SelectSeason.svelte';
	import SelectEpisode from './SelectEpisode.svelte';
	import { reiverrApi } from '../../apis/reiverr/reiverr-api'; 
	import { generalSettings } from '../../stores/generalSettings.store';
	import { formatSize } from '../../utils';
	import { createSerieRequestApprouved, createSerieRequest } from '../Requests/requestCreation';
	import { getOrAddSeriesToSonarr } from '../MediaManagerAuto/addSerieToSonarrAutomatically';
	import { handleSeriesDownload } from '../MediaManagerAuto/AutoDownloadManagerSerie';

	export let id: string;
	const tmdbId = Number(id);
	let requestExists = false;
	let pendingRequest = false;
	let requestedSeasons = writable<number[]>([]);

	let scrollTop: number;
    let loadingMessage = writable('');


	const { promise: tmdbSeries, data: tmdbSeriesData } = useRequest(tmdbApi.getTmdbSeries, tmdbId);
	let sonarrItem = sonarrApi.getSeriesByTmdbId(tmdbId);
	const { promise: recommendations } = useRequest(tmdbApi.getSeriesRecommendations, tmdbId);
	const jellyfinSeries = getJellyfinSeries(id);
	const jellyfinEpisodes = jellyfinSeries.then(s => (s && jellyfinApi.getJellyfinEpisodes(s.Id)) || []);
	const nextJellyfinEpisode = jellyfinEpisodes.then(items => items.find(i => i.UserData?.Played === false));
	const episodeCards = useRegistrar();
	const currentUser = get(user);
	let completedSeasons = writable<number[]>([]);
	let downloadingSeasons = writable<number[]>([]);

	$: allowRequests = $generalSettings?.data?.requests?.allowRequests ?? true;
	$: sonarrDownloads = getDownloads(sonarrItem);
	$: sonarrFiles = getFiles(sonarrItem);
	$: sonarrSeasonNumbers = Promise.all([sonarrFiles, sonarrDownloads]).then(([files, downloads]) => [...new Set(files.map(item => item.seasonNumber || -1)), ...new Set(downloads.map(item => item.seasonNumber || -1))]);
	$: sonarrEpisodes = Promise.all([sonarrItem, sonarrSeasonNumbers])
		.then(([item, seasons]) => Promise.all(seasons.map(s => sonarrApi.getEpisodes(item?.id || -1, s))))
		.then(items => items.flat());


	$: (async () => {
        const item = await sonarrItem;
        if (item) {
            const seasonNumbers = item.seasons
                .map(s => s.seasonNumber)
                .filter(n => n > 0);
            const statusPromises = seasonNumbers.map(seasonNumber => 
                sonarrApi.isSeasonFullyDownloaded(item.id, seasonNumber)
                    .then(isCompleted => isCompleted ? seasonNumber : null)
                    .catch(error => {
                        log(`Error checking season ${seasonNumber}: ${error}`);
                        return null;
                    })
            );

            const statusResults = await Promise.all(statusPromises);

            const completed = statusResults.filter(season => season !== null) as number[];

            const downloading = await sonarrApi.getDownloadsBySeriesId(item.id)
                .then(downloads => downloads.map(d => d.episode?.seasonNumber).filter(s => s !== undefined))
                .catch(error => {
                    log(`Error fetching downloading seasons: ${error}`);
                    return [];
                });

            completedSeasons.set(completed);
            downloadingSeasons.set(downloading);
        } else {
            completedSeasons.set([]);
            downloadingSeasons.set([]);
        }
    })();

	function getJellyfinSeries(id: string) {
		return jellyfinApi.getLibraryItemFromTmdbId(id);
	}

	function getFiles(item: typeof sonarrItem) {
		return item.then(item => (item ? sonarrApi.getFilesBySeriesId(item?.id || -1) : []));
	}

	function getDownloads(item: typeof sonarrItem) {
		return item.then(item => (item ? sonarrApi.getDownloadsBySeriesId(item?.id || -1) : []));
	}

	function formatRequestedSeasons(seasons: number[]) {
		console.log("Function formatRequestedSeasons");
		if (seasons.length === 0) return '';
		if (seasons.length === 1) return `Requested Season ${seasons[0]}`;
		const allButLast = seasons.slice(0, -1).join(', ');
		const last = seasons[seasons.length - 1];
		return `Requested Seasons ${allButLast} & ${last}`;
	}

	(async () => {
  try {
    const existingRequests = (await reiverrApi.getRequestsByMediaId(tmdbId)) || [];
    if (Array.isArray(existingRequests)) {
      requestExists = existingRequests.length > 0;
      pendingRequest = existingRequests.some(request => request.status === 'Pending');
      const pendingRequestedSeasons = existingRequests
	.filter(request => request.status === 'Pending')
	.map(request => request.season);
	requestedSeasons.set(pendingRequestedSeasons);
    } else {
      console.error('Expected an array for existingRequests, but got:', typeof existingRequests);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
})();

	async function handleRequestSeason() {
		console.log("Function handleRequestSeason");
    try {
        const tmdbSeries = await tmdbApi.getTmdbSeries(tmdbId);

        const sonarrItem = await getOrAddSeriesToSonarr(
            tmdbSeries.id,
            tmdbSeries.name,
            () => console.log('Series added successfully.')
        );
        
        if (!sonarrItem) {
            console.error('Failed to process series in Sonarr.');
            return;
        }

        const userSelection = await SelectSeasonAndEpisode(sonarrItem);
        console.log('Request Result:', userSelection);
        await checkQuotaAndCreateRequest(userSelection.season, sonarrItem, userSelection.episode, userSelection.choice);
    } catch (error) {
        console.error('Error handling request for season:', error);
    }
	}

	async function SelectSeasonAndEpisode(sonarrItem: any) {
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
		console.log("Function handleEpisodeSelection");
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, season);

    const totalEpisodes = episodes.length;
    const downloadedEpisodes = episodes.filter(episode => episode.hasFile).length;
    const allEpisodesAired = episodes.every(episode => new Date(episode.airDate) <= new Date());

    if (downloadedEpisodes === 0 && allEpisodesAired && totalEpisodes > 0) {
        return { sonarrItem, season, episode: null, choice: 1 }; // Choice 1: Automatic
    }
    return await openEpisodeSelectionModal(sonarrItem, season);
	}

	async function openEpisodeSelectionModal(sonarrItem: any, seasonNumber: number) {
    const episodes = await sonarrApi.getEpisodes(sonarrItem.id, seasonNumber);

    const formattedEpisodes = episodes.map(episode => ({
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        hasFile: episode.hasFile,
        airDate: episode.airDate
    }));

    return new Promise((resolve, reject) => {
        createModal(EpisodeSelectionDialog, {
            header: 'Episode Selection Mode',
            body: 'Some episodes of this season might not be released yet, or some may already be downloaded. Do you want to automatically monitor all episodes, or choose which ones to download manually?',
            automaticSelection: async () => {
                try {
					modalStack.closeTopmost();
                    await sonarrApi.monitorSeries(sonarrItem.id, true, 'none');
                    await sonarrApi.monitorSeason(sonarrItem.id, seasonNumber, true);
                    await sonarrApi.searchSeason(sonarrItem.id, seasonNumber);
                    resolve({ sonarrItem, season: seasonNumber, episode: null, choice: 2 });
                } catch (error) {
                    reject(error);
                }
            },
            manualSelection: async () => {
				modalStack.closeTopmost();
                const selected = await selectEpisodeManually(sonarrItem, seasonNumber);
                resolve({ sonarrItem, season: seasonNumber, episode: selected.episodeNumber, choice: 3 });
            }
        });
    });
	}

	async function selectEpisodeManually(sonarrItem: any, seasonNumber: number) {
		console.log("Function selectEpisodeManually");
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
                        await sonarrApi.monitorEpisode(selected.id);
                        await sonarrApi.searchEpisode(selected.id);
                        await createSerieRequestApprouved(tmdbId, currentUser, seasonNumber, selected.episodeNumber);
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

	async function checkQuotaAndCreateRequest(season: number, sonarrItem: any, episode: number, choice: number) {
		console.log("Function checkQuotaAndCreateRequest");
	const userId = currentUser?.id;
	const settings = get(generalSettings);
	const days = settings.data?.requests?.delayInDays ?? 30;
	const maxRequests = settings.data?.requests?.defaultLimitTV ?? 3;
	const userRequestCount = await reiverrApi.countRequestsInPeriodForUser(userId, days);
	const remainingRequests = Math.max(0, maxRequests - userRequestCount);
	const approvalMethod = settings.data?.requests.approvalMethod ?? 0;
	const setLimit = settings.data?.requests.setLimit ?? false;
	const canAutoApprove = currentUser?.isAdmin || (remainingRequests > 0 && approvalMethod === 0 && setLimit == true);

	if (canAutoApprove) {
	createApprovedRequestDialog(remainingRequests, days, maxRequests, sonarrItem, season, choice, episode, approvalMethod);
	} else {
	createPendingRequestDialog(season, episode);
	}
	}

	async function automaticDownloadSeason(sonarrItem: any, season: number) { 
		console.log("Function automaticDownloadSeason");
		modalStack.closeTopmost();
		createModal(SpinnerModal, {
			title: 'Processing Series Download',
			progressMessage: loadingMessage
		});
		try {
		await handleSeriesDownload(sonarrItem.id, season, (message: string) => { loadingMessage.set(message);}, (error: string) => {
			createErrorDialog(error, () => automaticDownloadSeason(sonarrItem, season));
		});
		await createSerieRequestApprouved(tmdbId, currentUser, season);
		requestExists = true;
		pendingRequest = false;

		loadingMessage.set("Process completed");
		setTimeout(() => modalStack.closeTopmost(), 1000);
	} catch (error: any) {
		createErrorDialog(error.message || 'Failed to download the series.', () => automaticDownloadSeason(sonarrItem, season));
	}
	}

	function createApprovedRequestDialog(
		remainingRequests: number, 
		days: number, 
		maxRequests: number, 
		sonarrItem: any, 
		season: number, 
		choice: number, 
		selectedEpisode?: number, 
		approvalMethod?: number
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
				if (choice === 1) {
					// Choice 1: Download the entire season
					await automaticDownloadSeason(sonarrItem, season);
				} else if (choice === 2) {
					// Choice 2: Automatically monitor and download the entire season
					await sonarrApi.monitorSeries(sonarrItem.id, true, 'none');
					await sonarrApi.monitorSeason(sonarrItem.id, season, true);
					await sonarrApi.searchSeason(sonarrItem.id, season);
					console.log(`Search initiated for season ${season} of series ${sonarrItem.id}.`);
				} else if (choice === 3 && selectedEpisode !== undefined) {
					// Choice 3: Download a specific episode
					await sonarrApi.monitorEpisode(selectedEpisode);
					await sonarrApi.searchEpisode(selectedEpisode);
					console.log(`Search initiated for episode ${selectedEpisode} of series ${sonarrItem.id}, season ${season}.`);
				} else {
					console.error('Invalid choice or missing episode for choice 3');
				}
			}
		});
	}

	function createPendingRequestDialog(season: number, episode: number) {
		createModal(ConfirmDialog, {
			header: 'Confirm Request',
			body: `Do you want to request season ${season}? An administrator will have to approve it before it appears in the library.`,
			confirm: async () => {
				try {
					await createSerieRequest(tmdbId, currentUser, season, episode);
					requestedSeasons.update(seasons => [...seasons, season]); 
				} catch (error) {
					console.error('Error confirming request creation:', error);
				}
			}
		});
	}

	function createConfirmDeleteSeasonDialog(files: EpisodeFileResource[]) {
		createModal(ConfirmDialog, {
			header: 'Delete Season Files?',
			body: `Are you sure you want to delete all ${files.length} file(s) from season ${files[0]?.seasonNumber}?`,
			confirm: () =>
				sonarrApi.deleteSonarrEpisodes(files.map(f => f.id || -1)).then(() => (sonarrFiles = getFiles(sonarrItem)))
		});
	}

	function createConfirmCancelDownloadsDialog(downloads: EpisodeDownload[]) {
		createModal(ConfirmDialog, {
			header: 'Cancel Season Downloads?',
			body: `Are you sure you want to cancel all ${downloads.length} download(s) from season ${downloads[0]?.seasonNumber}?`,
			confirm: () =>
				sonarrApi.cancelDownloads(downloads.map(d => d.id || -1)).then(() => (sonarrDownloads = getDownloads(sonarrItem)))
		});
	}

	function createErrorDialog(error: string, retryCallback: () => void) {
    const errorMessage = `An error occurred while downloading the season: ${error} Do you want to retry downloading the series?`;
    createModal(ConfirmDialog, {
        header: 'Download Error',
        body: errorMessage,
        confirm: () => {
            modalStack.closeTopmost();
            retryCallback();
        },
        cancel: () => {
            modalStack.closeTopmost();
        }
    });
	}
  </script>
  

<DetachedPage let:handleGoBack let:registrar>
	<ScrollHelper bind:scrollTop />
	<div class="relative">
		<Container
			class="h-[calc(100vh-4rem)] flex flex-col py-16 px-32"
			on:enter={scrollIntoView({ top: 0 })}
			on:navigate={({ detail }) => {
				if (detail.direction === 'down' && detail.willLeaveContainer) {
					$episodeCards?.focus();
					detail.preventNavigation();
				}
			}}
		>
		<HeroCarousel
		urls={$tmdbSeries.then((series) => {
			const sortedBackdrops = series?.images.backdrops
				?.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
				?.map((i) => ({
					trailerUrl: '',
					backdropUrl: TMDB_IMAGES_ORIGINAL + i.file_path
				}))
				.slice(0, 5) || [];	
			return sortedBackdrops;
		})}
			>
				<Container />
				<div class="h-full flex-1 flex flex-col justify-end">
					{#await $tmdbSeries then series}
						{#if series}
							<div
								class={classNames(
									'text-left font-medium tracking-wider text-stone-200 hover:text-amber-200 mt-2',
									{
										'text-4xl sm:text-5xl 2xl:text-6xl': series.name?.length || 0 < 15,
										'text-3xl sm:text-4xl 2xl:text-5xl': series.name?.length || 0 >= 15
									}
								)}
							>
								{series.name}
							</div>
							<div
								class="flex items-center gap-1 uppercase text-zinc-300 font-semibold tracking-wider mt-2 text-lg"
							>
								<p class="flex-shrink-0">
									{#if series.status !== 'Ended'}
										Since {new Date(series.first_air_date || Date.now())?.getFullYear()}
									{:else}
										Ended {new Date(series.last_air_date || Date.now())?.getFullYear()}
									{/if}
								</p>
								<!-- <DotFilled />
								<p class="flex-shrink-0">{movie.runtime}</p> -->
								<DotFilled />
								<p class="flex-shrink-0">
									<a href={'https://www.themoviedb.org/movie/' + series.id}
										>{series.vote_average} TMDB</a>
								</p>
								{#if $requestedSeasons.length > 0}
									<div class="py-0.10 px-3 rounded-lg" style="color: white; background-color: #ffa500; border-radius: 20px; display: inline-block; font-size: 0.75rem;">
										{formatRequestedSeasons($requestedSeasons)}
									</div>
								{/if}
							</div>
							<div
								class="text-stone-300 font-medium line-clamp-3 opacity-75 max-w-4xl mt-4 text-lg"
							>
								{series.overview}
							</div>
						{/if}
					{/await}
					<Container
						direction="horizontal"
						class="flex mt-8"
						focusOnMount
						on:back={handleGoBack}
						on:mount={registrar}
					>
						{#await nextJellyfinEpisode then nextJellyfinEpisode}
							{#if nextJellyfinEpisode}
								<Button
									class="mr-4"
									on:clickOrSelect={() =>
										nextJellyfinEpisode?.Id && playerState.streamJellyfinId(nextJellyfinEpisode.Id)}
								>
									Play Season {nextJellyfinEpisode?.ParentIndexNumber} Episode
									{nextJellyfinEpisode?.IndexNumber}
									<Play size={19} slot="icon" />
								</Button>
							{/if}
						{/await}
						<Button
							class="mr-4"
							on:clickOrSelect={() => handleRequestSeason()}
							disabled={!allowRequests}
						>
							Request
							<Plus size={19} slot="icon" />
						</Button>			

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

				</div>
			</HeroCarousel>
		</Container>
		<div
			class={classNames('transition-opacity', {
				// 'opacity-0': hideInterface
			})}
		>
			<EpisodeGrid
				on:enter={scrollIntoView({ top: -32, bottom: 128 })}
				on:mount={episodeCards.registrar}
				id={Number(id)}
				tmdbSeries={tmdbSeriesData}
				{jellyfinEpisodes}
				currentJellyfinEpisode={nextJellyfinEpisode}
				{handleRequestSeason}
			/>
			<Container on:enter={scrollIntoView({ top: 0 })} class="pt-8">
				{#await $tmdbSeries then series}
					<Carousel scrollClass="px-32" class="mb-8">
						<div slot="header">Show Cast</div>
						{#each series?.aggregate_credits?.cast?.slice(0, 15) || [] as credit}
							<TmdbPersonCard on:enter={scrollIntoView({ horizontal: 128 })} tmdbCredit={credit} />
						{/each}
					</Carousel>
				{/await}
				{#await $recommendations then recommendations}
					<Carousel scrollClass="px-32" class="mb-8">
						<div slot="header">Recommendations</div>
						{#each recommendations || [] as recommendation}
							<TmdbCard item={recommendation} on:enter={scrollIntoView({ horizontal: 128 })} />
						{/each}
					</Carousel>
				{/await}
			</Container>
			{#await $tmdbSeries then series}
				<Container class="flex-1 bg-secondary-950 pt-8 px-32" on:enter={scrollIntoView({ top: 0 })}>
					<h1 class="font-medium tracking-wide text-2xl text-zinc-300 mb-8">More Information</h1>
					<div class="text-zinc-300 font-medium text-lg flex flex-wrap">
						<div class="flex-1">
							<div class="mb-8">
								<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Created By</h2>
								{#each series?.created_by || [] as creator}
									<div>{creator.name}</div>
								{/each}
							</div>
							<div class="mb-8">
								<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Network</h2>
								<div>{series?.networks?.[0]?.name}</div>
							</div>
						</div>
						<div class="flex-1">
							<div class="mb-8">
								<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Language</h2>
								<div>{series?.spoken_languages?.[0]?.name}</div>
							</div>
							<div class="mb-8">
								<h2 class="uppercase text-sm font-semibold text-zinc-500 mb-0.5">Last Air Date</h2>
								<div>{series?.last_air_date}</div>
							</div>
						</div>
					</div>
				</Container>
			{/await}
			{#await Promise.all( [sonarrSeasonNumbers, sonarrFiles, sonarrEpisodes, sonarrDownloads] ) then [seasons, files, episodes, downloads]}
				{#if currentUser?.isAdmin && files?.length}
					<Container
						class="flex-1 bg-secondary-950 pt-8 pb-16 px-32 flex flex-col"
						on:enter={scrollIntoView({ top: 32 })}
					>
						<!--						<h1 class="font-medium tracking-wide text-2xl text-zinc-300 mb-8">Local Files</h1>-->
						<div class="space-y-16">
							{#each seasons as season}
								{@const seasonEpisodes = episodes.filter((e) => e.seasonNumber === season)}
								{@const seasonFiles = files.filter((f) => f.seasonNumber === season)}
								{@const seasonDownloads = downloads.filter((d) => d.seasonNumber === season)}

								<div>
									<div class="flex justify-between">
										<h2 class="font-medium tracking-wide text-2xl text-zinc-300 mb-8">
											Season {season} Files
										</h2>
									</div>

									<Container direction="grid" gridCols={2} class="grid grid-cols-2 gap-8">
										{#each seasonEpisodes as episode}
											{@const file = seasonFiles.find((f) => f.id === episode.episodeFileId)}
											{@const download = seasonDownloads.find((d) => d.episodeId === episode.id)}

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
												on:clickOrSelect={() => {
													if (file)
														modalStack.create(FileDetailsDialog, {
															file,
															title: episode?.title || '',
															subtitle: `Season ${episode?.seasonNumber} Episode ${episode?.episodeNumber}`,
															backgroundUrl: episode?.images?.[0]?.remoteUrl || '',
															onDelete: () => (sonarrFiles = getFiles(sonarrItem))
														});
													else if (download)
														modalStack.create(DownloadDetailsDialog, {
															download,
															title: episode?.title || '',
															subtitle: `Season ${episode?.seasonNumber} Episode ${episode?.episodeNumber}`,
															backgroundUrl: episode?.images?.[0]?.remoteUrl || '',
															onCancel: () => (sonarrDownloads = getDownloads(sonarrItem))
														});
												}}
												on:enter={scrollIntoView({ vertical: 128 })}
												focusOnClick
											>
												{#if download}
													<div
														class="absolute inset-0 bg-secondary-50/10"
														style={`width: ${
															(((download.size || 0) - (download.sizeleft || 0)) /
																(download.size || 1)) *
															100
														}%`}
													/>
												{/if}
												<div class="flex-1">
													<h1 class="text-lg">
														{episode?.episodeNumber}. {episode?.title}
													</h1>
												</div>
												{#if file}
													<div>
														{file?.mediaInfo?.runTime}
													</div>
													<div>
														{formatSize(file?.size || 0)}
													</div>
													<div>
														{file?.quality?.quality?.name}
													</div>
												{:else if download}
													<div>
														{formatSize((download?.size || 0) - (download?.sizeleft || 1))} / {formatSize(
															download?.size || 0
														)}
													</div>
													<div>
														{download?.quality?.quality?.name}
													</div>
												{/if}
											</Container>
										{/each}
									</Container>
									<Container direction="horizontal" class="flex mt-8">
										{#if seasonFiles?.length}
											<Button on:clickOrSelect={() => createConfirmDeleteSeasonDialog(seasonFiles)}>
												<Trash size={19} slot="icon" />
												Delete Season Files
											</Button>
										{/if}
										{#if seasonDownloads?.length}
											<Button
												on:clickOrSelect={() => createConfirmCancelDownloadsDialog(seasonDownloads)}
											>
												<Cross1 size={19} slot="icon" />
												Cancel Season Downloads
											</Button>
										{/if}
									</Container>
								</div>
							{/each}
						</div>
					</Container>
				{/if}
			{/await}
		</div>
	</div>
</DetachedPage>
