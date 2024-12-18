<script lang="ts">
	import TextField from '../TextField.svelte';
	import { createEventDispatcher } from 'svelte';
	import SelectField from '../SelectField.svelte';
	import { radarrApi } from '../../apis/radarr/radarr-api';
	import { generalSettings } from '../../stores/generalSettings.store';
	import { derived, get } from 'svelte/store';
	import { createModal } from '../Modal/modal.store';
	import SelectItemDialog from '../SelectItemDialog.svelte';

	interface Profile {
		id: number;
		name: string;
	}

	interface QualityProfile {
		id: number;
		name: string;
	}

	interface RootFolder {
		path: string;
	}

	interface QualityProfile {
		id: number;
		name: string;
	}

	type Availability = 'announced' | 'inCinemas' | 'released';


	let timeout: ReturnType<typeof setTimeout>;
	let healthCheck: Promise<boolean> | undefined;

	let rootFolders: RootFolder[] = [];
	let qualityProfiles: QualityProfile[] = [];
	let movieAvailabilities: Availability[] = ['announced', 'inCinemas', 'released'];
	const movieAvailabilityOptions = movieAvailabilities.map(availability => ({ name: availability }));

	let baseUrl = '', apiKey = '', selectedRootFolder = '', selectedQualityProfile = 0, selectedAvailability = 'released';
	let stale = false, error = '';


	const originalBaseUrl = derived(generalSettings, s => s?.data?.integrations?.radarr?.baseUrl || '');
	const originalApiKey = derived(generalSettings, s => s?.data?.integrations?.radarr?.apiKey || '');
	const originalRootFolder = derived(generalSettings, s => s?.data?.integrations?.radarr?.rootFolderPath || '');
	const originalQualityProfile = derived(generalSettings, s => s?.data?.integrations?.radarr?.qualityProfileId || 0);
	const originalAvailability = 'released';

	generalSettings.subscribe(storeState => {
		if (storeState?.data?.integrations?.radarr) {
			baseUrl = storeState.data.integrations.radarr.baseUrl || '';
			apiKey = storeState.data.integrations.radarr.apiKey || '';
			selectedRootFolder = storeState.data.integrations.radarr.rootFolderPath || '';
			selectedQualityProfile = storeState.data.integrations.radarr.qualityProfileId || 0;
			selectedAvailability = storeState.data.integrations.radarr.minimumAvailability || 'released';
		}
	});

	handleChange();
	async function handleChange() {
		clearTimeout(timeout);
		stale = false;
		error = '';
		healthCheck = undefined;

		if (!baseUrl || !apiKey) {
			stale = getIsStale();
			return;
		}

		const baseUrlCopy = baseUrl;
		const apiKeyCopy = apiKey;

		timeout = setTimeout(async () => {
			try {
				const res = await radarrApi.getHealth(baseUrlCopy, apiKeyCopy);
				healthCheck = res.status === 200;

				if (res.status !== 200) {
					error = res.status === 404 ? 'Server not found' : res.status === 401 ? 'Invalid API key' : 'Could not connect';
					stale = false;
					return;
				}

				[rootFolders, qualityProfiles] = await Promise.all([
					radarrApi.getRootFolders(baseUrlCopy, apiKeyCopy),
					radarrApi.getQualityProfiles(baseUrlCopy, apiKeyCopy)
				]);

				if (!selectedRootFolder && rootFolders.length > 0) {
					selectedRootFolder = rootFolders[0].path;
				}
				if (!selectedQualityProfile && qualityProfiles.length > 0) {
					selectedQualityProfile = qualityProfiles[0].id;
				}

				stale = getIsStale();
			} catch (fetchError) {
				error = 'Failed to communicate with the server. Please check the URL and API key.';
			}
		}, 1000);
	}

	function getIsStale() {
		return !!healthCheck || (!baseUrl && !apiKey) || get(originalBaseUrl) !== baseUrl || get(originalApiKey) !== apiKey || 
		       get(originalRootFolder) !== selectedRootFolder || get(originalQualityProfile) !== selectedQualityProfile || 
			   originalAvailability !== selectedAvailability;
	}

	function openModal(items, selectedItem, onSelect) {
		createModal(SelectItemDialog, { items, selectedItem, handleSelectItem: onSelect });
	}

	async function handleSave() {
		try {
			const currentSettings = get(generalSettings)?.data?.integrations?.radarr || {};
			await generalSettings.updateSettings(prev => ({
				...prev,
				integrations: {
					...prev.integrations,
					radarr: {
						baseUrl,
						apiKey,
						rootFolderPath: selectedRootFolder,
						qualityProfileId: selectedQualityProfile,
						minimumAvailability: selectedAvailability
					}
				}
			}));
		} catch (error) {
			console.error("Failed to save settings:", error);
		}
	}

	$: empty = !baseUrl && !apiKey;
	$: unchanged = baseUrl === get(originalBaseUrl) && apiKey === get(originalApiKey) && selectedRootFolder === get(originalRootFolder) && selectedQualityProfile === get(originalQualityProfile) && selectedAvailability === originalAvailability;
</script>

<!-- Partie HTML -->
<div class="space-y-4 mb-4">
	<TextField bind:value={baseUrl} isValid={healthCheck} on:change={handleChange}>Base Url</TextField>
	<TextField bind:value={apiKey} isValid={healthCheck} on:change={handleChange}>API Key</TextField>
</div>

{#if error}
	<div class="text-red-500 mb-4">{error}</div>
{/if}

{#if rootFolders.length > 0 && qualityProfiles.length > 0}
	<div class="space-y-4 mb-4">
		<SelectField value={selectedRootFolder} on:clickOrSelect={() => openModal(rootFolders, selectedRootFolder, folder => { selectedRootFolder = folder.path; handleChange(); })} tabindex="0">
			Root Folder
		</SelectField>
	</div>

	<div class="space-y-4 mb-4">
		<SelectField value={qualityProfiles.find(qp => qp.id === selectedQualityProfile)?.name} on:clickOrSelect={() => openModal(qualityProfiles, selectedQualityProfile, profile => { selectedQualityProfile = profile.id; handleChange(); })} tabindex="0">
			Quality Profile
		</SelectField>
	</div>

	<div class="space-y-4 mb-4">
		<SelectField value={selectedAvailability} on:clickOrSelect={() => openModal(movieAvailabilityOptions, selectedAvailability, availability => {selectedAvailability = availability.name;handleChange();})} tabindex="0">
			Availability
		</SelectField>
	</div>
{/if}

<slot {handleSave} {stale} {empty} {unchanged} />
