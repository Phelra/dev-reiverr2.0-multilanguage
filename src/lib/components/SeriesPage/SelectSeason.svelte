<script lang="ts">
    import { writable } from 'svelte/store';
    import Toggle from '../Toggle.svelte';
    import Dialog from '../Dialog/Dialog.svelte';
    import Button from '../Button.svelte';
    import { modalStack } from '../Modal/modal.store';

    export let modalId: symbol;
    export let selectedSeason = writable<number | null>(null);
    export let seasons = writable<number[]>([]);
    export let requestedSeasons = writable<number[]>([]);
    export let unavailableSeasons: number[] = [];
    export let onConfirm: (season: number) => void;

    function confirmSelection() {
        const season = $selectedSeason;
        if (season !== null) {
            onConfirm(season);
            modalStack.close(modalId);
        }
    }

    function cancelSelection() {
        selectedSeason.set(null);
        modalStack.close(modalId);
    }

    function toggleSeason(seasonNumber: number, isChecked: boolean) {
        if (isChecked && !unavailableSeasons.includes(seasonNumber)) {
            selectedSeason.set(seasonNumber);
        } else {
            selectedSeason.set(null);
        }
    }

    let firstHalf: number[] = [];
    let secondHalf: number[] = [];
    $: if ($seasons.length > 10) {
        const mid = Math.ceil($seasons.length / 2);
        firstHalf = $seasons.slice(0, mid);
        secondHalf = $seasons.slice(mid);
    }
</script>

<Dialog>
    <div class="flex flex-col items-center justify-center space-y-6 w-full">
        <h1 class="text-2xl font-semibold">Select a Season</h1>

        {#if $seasons.length > 10}
            <div class="flex w-full space-x-4">
                <div class="flex-1 space-y-2">
                    {#each firstHalf as season}
                        <div class="flex items-center justify-between text-lg font-medium text-secondary-100 w-full">
                            <label
                                class="mr-2 flex-1"
                                for="season-{season}"
                                title={unavailableSeasons.includes(season) ? 'This season has already been requested or is completed.' : ''}
                            >
                                Season {season}
                                {#if $requestedSeasons.includes(season)}
                                    (Requested)
                                {/if}
                            </label>
                            <Toggle
                                checked={$selectedSeason === season || unavailableSeasons.includes(season)}
                                disabled={unavailableSeasons.includes(season)}
                                on:change={({ detail }) => toggleSeason(season, detail)}
                            />
                        </div>
                    {/each}
                </div>
                <div class="flex-1 space-y-2">
                    {#each secondHalf as season}
                        <div class="flex items-center justify-between text-lg font-medium text-secondary-100 w-full">
                            <label
                                class="mr-2 flex-1"
                                for="season-{season}"
                                title={unavailableSeasons.includes(season) ? 'This season has already been requested or is completed.' : ''}
                            >
                                Season {season}
                                {#if $requestedSeasons.includes(season)}
                                    (Requested)
                                {/if}
                            </label>
                            <Toggle
                                checked={$selectedSeason === season || unavailableSeasons.includes(season)}
                                disabled={unavailableSeasons.includes(season)}
                                on:change={({ detail }) => toggleSeason(season, detail)}
                            />
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            {#each $seasons as season}
                <div class="flex items-center justify-between text-lg font-medium text-secondary-100 w-full">
                    <label
                        class="mr-2 flex-1"
                        for="season-{season}"
                        title={unavailableSeasons.includes(season) ? 'This season has already been requested or is completed.' : ''}
                    >
                        Season {season}
                        {#if $requestedSeasons.includes(season)}
                            (Requested)
                        {/if}
                    </label>
                    <Toggle
                        checked={$selectedSeason === season || unavailableSeasons.includes(season)}
                        disabled={unavailableSeasons.includes(season)}
                        on:change={({ detail }) => toggleSeason(season, detail)}
                    />
                </div>
            {/each}
        {/if}

        <div class="flex flex-col space-y-4 mt-4 w-full">
            <Button
                class="buttonRequest small-button w-full"
                type="primary-dark"
                on:clickOrSelect={confirmSelection}
                disabled={$selectedSeason === null}
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