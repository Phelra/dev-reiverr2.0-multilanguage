<script lang="ts">
	import TextField from '../TextField.svelte';
	import SelectField from '../SelectField.svelte';
	import { sonarrApi } from '../../apis/sonarr/sonarr-api';
	import { generalSettings } from '../../stores/generalSettings.store';
	import { derived, get } from 'svelte/store';
	import { createModal } from '../Modal/modal.store';
	import SelectItemDialog from '../SelectItemDialog.svelte';

	interface Profile {
		id: number;
		name: string;
	}

	interface RootFolder {
		path: string;
	}

	type MonitorOptions = 'all' | 'future' | 'missing' | 'unknown' | 'existing' | 'firstSeason' | 'latestSeason' | 'pilot' | 'monitorSpecials' | 'unmonitorSpecials' | 'none';

	let baseUrl = '', apiKey = '', selectedRootFolder = '', selectedQualityProfile = 0, selectedMonitorOption: MonitorOptions = 'none';
	let rootFolders: RootFolder[] = [], qualityProfiles: Profile[] = [];
	let monitorStrategies: MonitorOptions[] = [
		'unknown', 'all', 'future', 'missing', 'existing', 'firstSeason',
		'latestSeason', 'pilot', 'monitorSpecials', 'unmonitorSpecials', 'none'
	];
	const monitorStrategyOptions = monitorStrategies.map(strategy => ({ name: strategy }));

	let stale = false, error = '';
	let healthCheck: boolean | undefined;
	let timeout: ReturnType<typeof setTimeout>;

	const originalBaseUrl = derived(generalSettings, s => s?.data?.integrations?.sonarr?.baseUrl || '');
	const originalApiKey = derived(generalSettings, s => s?.data?.integrations?.sonarr?.apiKey || '');
	const originalRootFolder = derived(generalSettings, s => s?.data?.integrations?.sonarr?.rootFolderPath || '');
	const originalQualityProfile = derived(generalSettings, s => s?.data?.integrations?.sonarr?.qualityProfileId || 0);
	const originalMonitorOption = derived(generalSettings, s => s?.data?.integrations?.sonarr?.monitorStrategy || 'none');

	generalSettings.subscribe(storeState => {
		if (storeState?.data?.integrations?.sonarr) {
			baseUrl = storeState.data.integrations.sonarr.baseUrl || '';
			apiKey = storeState.data.integrations.sonarr.apiKey || '';
			selectedRootFolder = storeState.data.integrations.sonarr.rootFolderPath || '';
			selectedQualityProfile = storeState.data.integrations.sonarr.qualityProfileId || 0;
			selectedMonitorOption = storeState.data.integrations.sonarr.monitorStrategy || 'none';
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
				const res = await sonarrApi.getHealth(baseUrlCopy, apiKeyCopy);
				healthCheck = res.status === 200;

				if (res.status !== 200) {
					error = res.status === 404 ? 'Server not found' : res.status === 401 ? 'Invalid API key' : 'Could not connect';
					stale = false;
					return;
				}

				[rootFolders, qualityProfiles] = await Promise.all([
					sonarrApi.getSonarrRootFolders(baseUrlCopy, apiKeyCopy),
					sonarrApi.getSonarrQualityProfiles(baseUrlCopy, apiKeyCopy)
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
			   get(originalMonitorOption) !== selectedMonitorOption;
	}

	function openModal(items, selectedItem, onSelect) {
		createModal(SelectItemDialog, { items, selectedItem, handleSelectItem: onSelect });
	}

	async function handleSave() {
		try {
			const currentSettings = get(generalSettings)?.data?.integrations?.sonarr || {};
			await generalSettings.updateSettings(prev => ({
				...prev,
				integrations: {
					...prev.integrations,
					sonarr: {
						baseUrl,
						apiKey,
						rootFolderPath: selectedRootFolder,
						qualityProfileId: selectedQualityProfile,
						monitorStrategy: selectedMonitorOption
					}
				}
			}));
		} catch (error) {
			console.error("Failed to save settings:", error);
		}
	}

	$: empty = !baseUrl && !apiKey;
	$: unchanged = baseUrl === get(originalBaseUrl) && apiKey === get(originalApiKey) && selectedRootFolder === get(originalRootFolder) && selectedQualityProfile === get(originalQualityProfile) && selectedMonitorOption === get(originalMonitorOption);
</script>

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
		<SelectField value={selectedMonitorOption} on:clickOrSelect={() => openModal(monitorStrategyOptions, selectedMonitorOption, option => { selectedMonitorOption = option.name; handleChange(); })} tabindex="0">
			Monitor Strategy
		</SelectField>
	</div>
{/if}

<slot {handleSave} {stale} {empty} {unchanged} />
