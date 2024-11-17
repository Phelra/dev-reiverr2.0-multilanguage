<script lang="ts">
    import Dialog from './Dialog/Dialog.svelte';
    import SelectItem from './SelectItem.svelte';
    import { modalStack } from './Modal/modal.store';

    export let items: { id?: number, name?: string, path?: string }[] = [];
    export let selectedItem: string | number | undefined = undefined;
    export let handleSelectItem: (item: any) => void;

    function handleSelect(item: any) {
        handleSelectItem(item);
        modalStack.closeTopmost();
    }
</script>

<Dialog>
    <h1 class="header1 mb-2">Select an Item</h1>
    <div class="space-y-4">
        {#each items as item}
            <SelectItem
                selected={item.id === selectedItem || item.path === selectedItem}
                on:clickOrSelect={() => handleSelect(item)}
            >
                {item.name || item.path}
            </SelectItem>
        {/each}
    </div>
</Dialog>

