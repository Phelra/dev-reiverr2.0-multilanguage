<script lang="ts">
	import { tmdbApi } from '../../apis/tmdb/tmdb-api';
    import { generalSettings } from '../../stores/generalSettings.store';
	import SelectField from '../SelectField.svelte';
	import { Trash } from 'radix-icons-svelte';
	import { derived } from 'svelte/store';
	import classNames from 'classnames';

	const userId = derived(generalSettings, (settings) => settings?.data?.integrations?.tmdb?.userId);

	$: connectedTmdbAccount = !!$userId && tmdbApi.getAccountDetails();

	async function handleDisconnectTmdb() {
		return generalSettings.updateSettings((prev) => ({
            ...prev,
            integrations: {
                ...prev.integrations,
                tmdb: {
                    userId: '',
                    sessionId: ''
                }
            }
        }));
	}
</script>

{#await connectedTmdbAccount then tmdbAccount}
	{#if tmdbAccount}
		<SelectField value={tmdbAccount.username || ''} action={handleDisconnectTmdb}>
			Connected as admin
			<Trash slot="icon" let:size let:iconClass {size} class={classNames(iconClass, '')} />
		</SelectField>
	{/if}
	<slot connected={!!tmdbAccount} />
{/await}