<script lang="ts">
    import Dialog from './Dialog/Dialog.svelte';
    import SelectItem from './SelectItem.svelte';
    import { modalStack } from './Modal/modal.store';

    export let items: { id?: number, name?: string, path?: string }[] = [];
    export let selectedItem: string | number | undefined = undefined;
    export let handleSelectItem: (item: any) => void;

    let firstHalf: typeof items = [];
    let secondHalf: typeof items = [];
    $: if (items.length > 10) {
        const mid = Math.ceil(items.length / 2);
        firstHalf = items.slice(0, mid);
        secondHalf = items.slice(mid);
    }

    function handleSelect(item: any) {
        handleSelectItem(item);
        modalStack.closeTopmost();
    }
</script>

<Dialog>
    <h1 class="header1 mb-2">Select an Item</h1>
    <div class="space-y-4">
        {#if items.length > 10}
            <div class="flex space-x-4">
                <div class="flex-1 space-y-2">
                    {#each firstHalf as item}
                        <SelectItem
                            selected={item.id === selectedItem || item.path === selectedItem}
                            on:clickOrSelect={() => handleSelect(item)}
                        >
                            {item.name || item.path}
                        </SelectItem>
                    {/each}
                </div>
                <div class="flex-1 space-y-2">
                    {#each secondHalf as item}
                        <SelectItem
                            selected={item.id === selectedItem || item.path === selectedItem}
                            on:clickOrSelect={() => handleSelect(item)}
                        >
                            {item.name || item.path}
                        </SelectItem>
                    {/each}
                </div>
            </div>
        {:else}
            {#each items as item}
                <SelectItem
                    selected={item.id === selectedItem || item.path === selectedItem}
                    on:clickOrSelect={() => handleSelect(item)}
                >
                    {item.name || item.path}
                </SelectItem>
            {/each}
        {/if}
    </div>
</Dialog>
