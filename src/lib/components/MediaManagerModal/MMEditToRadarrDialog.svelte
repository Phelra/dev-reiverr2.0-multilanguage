<script lang="ts">
	import Dialog from '../Dialog/Dialog.svelte';
	import { TMDB_BACKDROP_SMALL } from '../../constants';
	import { type BackEvent, scrollIntoView, type Selectable } from '../../selectable';
	import { createLocalStorageStore } from '../../stores/localstorage.store';
	import {
		movieAvailabilities,
		type MovieAvailability,
		radarrApi
	} from '../../apis/radarr/radarr-api';
	import { modalStack } from '../Modal/modal.store';
	import classNames from 'classnames';
	import { fade } from 'svelte/transition';
	import Container from '../../../Container.svelte';
	import { capitalize } from '../../utils';
	import { ArrowRight, Check, Plus } from 'radix-icons-svelte';
	import Button from '../Button.svelte';
	import Toggle from '../Toggle.svelte';

	type EditOptionsStore = {
		qualityProfileId: number | null;
		minimumAvailability: MovieAvailability | null;
		monitored: boolean;
	};

	export let backdropUri: string;
	export let title: string;
    export let radarrItem: string;
	export let modalId: symbol;
	$: backgroundUrl = TMDB_BACKDROP_SMALL + backdropUri;

	let tab: 'edit-radarr' | 'quality-profiles' | 'monitor-settings' = 'edit-radarr';
	let editRadarrTab: Selectable;
	let qualityProfilesTab: Selectable;
	let monitorSettingsTab: Selectable;
	$: {
		if (tab === 'edit-radarr' && editRadarrTab) editRadarrTab.focus();
		if (tab === 'quality-profiles' && qualityProfilesTab) qualityProfilesTab.focus();
		if (tab === 'monitor-settings' && monitorSettingsTab) monitorSettingsTab.focus();
	}

	const editOptionsStore = createLocalStorageStore<EditOptionsStore>('edit-radarr-options', {
		qualityProfileId: radarrItem.qualityProfileId || null,
        minimumAvailability: radarrItem.minimumAvailability || null,
        monitored: radarrItem.monitored || false
	});

	const radarrOptions = radarrApi.getQualityProfiles().then((qualityProfiles) => ({
		qualityProfiles
	}));

	function handleUpdateRadarr() {
		return radarrApi
			.updateMovieInRadarr(radarrItem, {
				qualityProfileId: $editOptionsStore.qualityProfileId || undefined,
				minimumAvailability: $editOptionsStore.minimumAvailability || undefined,
				monitored: $editOptionsStore.monitored
			})
			.then((success) => {
				if (success) {
					modalStack.close(modalId);
				}
			});
	}

	function handleBack(e: BackEvent) {
		if (tab !== 'edit-radarr') {
			tab = 'edit-radarr';
			e.detail.stopPropagation();
		}
	}

	const tabClasses = (active: boolean, secondary: boolean = false) =>
		classNames('flex flex-col transition-all', {
			'opacity-0 pointer-events-none': !active,
			'-translate-x-10': !active && !secondary,
			'translate-x-10': !active && secondary,
			'absolute inset-0': secondary
		});

	const listItemClass = `flex items-center justify-between bg-primary-900 rounded-xl px-6 py-2.5 mb-4 font-medium
		border-2 border-transparent focus:border-primary-500 hover:border-primary-500 cursor-pointer group`;

	const scaledArrowClas = (hasFocus: boolean) =>
		classNames('transition-transform', {
			'text-primary-500 translate-x-0.5 scale-110': hasFocus,
			'group-hover:text-primary-500 group-hover:translate-x-0.5 group-hover:scale-110': true
		});
</script>

<Dialog>
	{#if backgroundUrl && tab === 'edit-radarr'}
		<div
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 bg-cover bg-center h-52"
			style="background-image: url({backgroundUrl}); -webkit-mask-image: radial-gradient(at 90% 10%, hsla(0,0%,0%,1) 0px, transparent 70%);"
		/>
	{/if}

	{#await radarrOptions then { qualityProfiles }}
		{@const selectedQualityProfile = qualityProfiles.find(
			(f) => f.id === $editOptionsStore.qualityProfileId
		)}
		<Container on:back={handleBack} class="relative">
			<Container
				trapFocus
				bind:selectable={editRadarrTab}
				class={tabClasses(tab === 'edit-radarr')}
			>
				<div class="z-10 mb-8">
					<div class="h-24" />
					<h1 class="header2">Edit {title}</h1>
					<div class="font-medium text-secondary-300 mb-8">
						Modify the quality profile and monitoring settings for this movie.
					</div>

					<Container
						class={listItemClass}
						on:clickOrSelect={() => (tab = 'quality-profiles')}
						let:hasFocus
					>
						<div>
							<h1 class="text-secondary-300 font-semibold tracking-wide text-sm">
								Quality Profile
							</h1>
							<span>
								{selectedQualityProfile?.name}
							</span>
						</div>
						<ArrowRight class={scaledArrowClas(hasFocus)} size={24} />
					</Container>

					<Container
						class={listItemClass}
						on:clickOrSelect={() => (tab = 'monitor-settings')}
						let:hasFocus
					>
						<div>
							<h1 class="text-secondary-300 font-semibold tracking-wide text-sm">
								Minimum Availability
							</h1>
							<span>
								{capitalize($editOptionsStore.minimumAvailability || 'released')}
							</span>
						</div>
						<ArrowRight class={scaledArrowClas(hasFocus)} size={24} />
					</Container>

					<div class="flex items-center justify-between text-lg font-medium text-secondary-100 py-2">
						<label class="mr-2">Monitored</label>
						<Toggle bind:checked={$editOptionsStore.monitored} />
					</div>
				</div>
				<Container class="flex flex-col space-y-4">
					<Button type="primary-dark" action={handleUpdateRadarr} focusOnMount>
						<Plus size={19} slot="icon" />
						Update
					</Button>
					<Button type="primary-dark" on:clickOrSelect={() => modalStack.close(modalId)}>
						Cancel
					</Button>
				</Container>
			</Container>

			<Container
				trapFocus
				class={tabClasses(tab === 'quality-profiles', true)}
				bind:selectable={qualityProfilesTab}
			>
				<h1 class="text-xl text-secondary-100 font-medium mb-4">Quality Profile</h1>
				<div class="min-h-0 overflow-y-auto scrollbar-hide">
					{#each qualityProfiles as qualityProfile}
						<Container
							class={listItemClass}
							on:enter={scrollIntoView({ vertical: 64 })}
							on:clickOrSelect={() => {
                                editOptionsStore.update((prev) => ({
                                    ...prev,
                                    qualityProfileId: qualityProfile.id || 0
                                }));
                                tab = 'edit-radarr';
                            }}
							focusOnClick
							focusOnMount={$editOptionsStore.qualityProfileId === qualityProfile.id}
						>
							<div>{qualityProfile.name}</div>
							{#if selectedQualityProfile?.id === qualityProfile.id}
								<Check size={24} />
							{/if}
						</Container>
					{/each}
				</div>
			</Container>

			<Container
				trapFocus
				class={tabClasses(tab === 'monitor-settings', true)}
				bind:selectable={monitorSettingsTab}
			>
				<h1 class="text-xl text-secondary-100 font-medium mb-4">Monitor Episodes</h1>
				<div class="min-h-0 overflow-y-auto scrollbar-hide">
					{#each movieAvailabilities as availibility}
						<Container
							class={listItemClass}
							on:enter={scrollIntoView({ vertical: 64 })}
							on:clickOrSelect={() => {
                                editOptionsStore.update((prev) => ({ ...prev, minimumAvailability: availibility }));
                                tab = 'edit-radarr';
                            }}
							focusOnClick
							focusOnMount={$editOptionsStore.minimumAvailability === availibility}
						>
							<div>{capitalize(availibility)}</div>
							{#if $editOptionsStore.minimumAvailability === availibility}
								<Check size={24} />
							{/if}
						</Container>
					{/each}
				</div>
			</Container>
		</Container>
	{/await}
</Dialog>
