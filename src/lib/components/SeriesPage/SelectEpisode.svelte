<script lang="ts">
    import { writable } from 'svelte/store';
    import Toggle from '../Toggle.svelte';
    import Dialog from '../Dialog/Dialog.svelte';
    import Button from '../Button.svelte';
    import { modalStack } from '../Modal/modal.store';

    export let modalId: symbol;
    export let size: 'sm' | 'lg' | 'full' | 'dynamic' = 'lg';
    
    export let selectedEpisode = writable<{ id: number, episodeNumber: number, title: string, hasFile: boolean, airDate?: string } | null>(null);
    export let episodes = writable<{ id: number, episodeNumber: number, title: string, hasFile: boolean, airDate?: string }[]>([]);
    export let onConfirm: (episode: { id: number, episodeNumber: number, title: string, hasFile: boolean, airDate?: string } | null) => void;

    function confirmSelection() {
        const selected = $selectedEpisode;
        if (selected !== null) {
            onConfirm(selected);
            modalStack.close(modalId);
        }
    }

    function cancelSelection() {
        selectedEpisode.set(null);
        modalStack.close(modalId);
    }

    function toggleEpisode(episode: { id: number, episodeNumber: number, title: string, hasFile: boolean, airDate?: string }, isChecked: boolean) {
        if (isChecked && !episode.hasFile) {
            selectedEpisode.set(episode);
        } else {
            selectedEpisode.set(null);
        }
    }

    function formatAirDate(airDate?: string): string {
        if (airDate) {
            const date = new Date(airDate);
            if (date > new Date()) {
                return `(Air Date: ${date.toLocaleDateString()})`;
            }
        }
        return '';
    }

    function splitEpisodesIntoColumns(episodes: { id: number, episodeNumber: number, title: string, hasFile: boolean, airDate?: string }[]) {
        const columns = [];
        for (let i = 0; i < episodes.length; i += 12) {
            columns.push(episodes.slice(i, i + 12));
        }
        return columns;
    }

    $: episodeColumns = splitEpisodesIntoColumns($episodes);
</script>

<Dialog {size}>
    <div class="flex flex-col items-center justify-center space-y-6 w-full">
        <h1 class="text-2xl font-semibold">Select Episode</h1>

        <div class="flex w-full space-x-4">
            {#each episodeColumns as column}
                <div class="flex-1 space-y-2">
                    {#each column as episode}
                        <div class="flex items-center justify-between text-lg font-medium text-secondary-100 w-full">
                            <label class="mr-2 flex-1" for="episode-{episode.episodeNumber}">
                                Episode {episode.episodeNumber}: {episode.title} {formatAirDate(episode.airDate)}
                            </label>
                            <Toggle
                                checked={$selectedEpisode?.id === episode.id || episode.hasFile}
                                disabled={episode.hasFile}
                                on:change={({ detail }) => toggleEpisode(episode, detail)}
                            />
                        </div>
                    {/each}
                </div>
            {/each}
        </div>

        <div class="flex flex-col space-y-4 mt-4 w-full">
            <Button
                class="buttonRequest small-button w-full"
                type="primary-dark"
                on:clickOrSelect={confirmSelection}
                disabled={$selectedEpisode === null} 
            >
                Confirm
            </Button>
            <Button
                class="buttonRequest small-button w-full"
                type="primary-dark"
                on:clickOrSelect={cancelSelection}
            >
                Cancel
            </Button>
        </div>
    </div>
</Dialog>
