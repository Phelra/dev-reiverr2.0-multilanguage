<script lang="ts">
    import { Stretch } from 'svelte-loading-spinners';
    import { modalStack } from './Modal/modal.store';
    import { writable, type Writable } from 'svelte/store';
    import Dialog from './Dialog/Dialog.svelte';

    export let title: string = "Processing";
    export let progressMessage: Writable<string>;
</script>

<Dialog>
    <div class="flex flex-col items-center justify-center space-y-6">
        <h1 class="text-2xl font-semibold">{title}</h1>
        <Stretch size="60" color="hsl(40 60% 55%)" unit="px" duration="1s" />
        <p class="text-lg text-white">{$progressMessage}</p>
    </div>
</Dialog>