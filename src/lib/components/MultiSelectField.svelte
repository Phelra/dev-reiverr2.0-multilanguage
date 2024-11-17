<script lang="ts">
    import { writable } from 'svelte/store';
    import Toggle from './Toggle.svelte';
    import Dialog from './Dialog/Dialog.svelte';
    import Button from './Button.svelte';
    import { modalStack } from './Modal/modal.store';
    import TextField from './TextField.svelte';
    import { scrollIntoView } from '../selectable';
    import Container from '../../Container.svelte';

    export let modalId: symbol;
    export let items: { id: string | number, name: string, path?: string }[] = [];
    export let selectedItems = writable<(string | number)[]>([]);
    export let unavailableItems: (string | number)[] = [];
    export let onConfirm: (selectedItems: (string | number)[]) => void;

    let tempSelectedItems = writable<(string | number)[]>([]);
    let searchQuery = writable('');
    $: tempSelectedItems.set($selectedItems || []);

    function confirmSelection() {
    tempSelectedItems.update(items => {
        selectedItems.set(items);
        console.log("Selected items on confirm:", items); // Debugging output
        onConfirm(items);
        modalStack.close(modalId);
        return items;
    });
}


    function cancelSelection() {
        tempSelectedItems.set($selectedItems || []);
        modalStack.close(modalId);
    }

    function toggleItem(itemId: string | number, isChecked: boolean) {
        tempSelectedItems.update(items => {
            if (isChecked) {
                return [...items, itemId];
            } else {
                return items.filter(id => id !== itemId);
            }
        });
    }
</script>


<Container class="flex-1 grid w-full overflow-y-auto scrollbar-hide relative pb-16 px-32">
    <Dialog>
        <div class="flex flex-col items-center justify-center space-y-6 w-full">
            <h1 class="text-2xl font-semibold">Select Items</h1>

            {#if items.length > 10}
                <TextField
                    bind:value={$searchQuery}
                    placeholder="Rechercher..."
                    class="w-full"
                >Search</TextField>
            {/if}

            <div 
                class="w-full space-y-2 max-h-96 overflow-y-auto overflow-x-auto"             >
                {#each items.filter(item => 
                    (item.name || item.path || '').toLowerCase().includes($searchQuery.toLowerCase())
                ) as item}
                    <div class="flex items-center justify-between text-lg font-medium text-secondary-100 w-full">
                        <label class="mr-2 flex-1" for="item-{item.id}">
                            {item.name || item.path}
                        </label>
                        {#if $tempSelectedItems && unavailableItems}
                            <Toggle
                                checked={$tempSelectedItems.includes(item.id)}
                                disabled={unavailableItems.includes(item.id)}
                                on:change={({ detail }) => toggleItem(item.id, detail)}
                                on:enter={scrollIntoView({ horizontal: 64 })}
                                focusOnClick
                            />
                        {/if}
                    </div>
                {/each}
            </div>

            <div class="flex flex-col space-y-4 mt-4 w-full">
                <Button
                    class="buttonRequest small-button w-full"
                    type="primary-dark"
                    on:clickOrSelect={confirmSelection}
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
</Container>
