<script lang="ts">
    import Container from '../../../Container.svelte';
    import TextField from '../TextField.svelte';
    import Button from '../Button.svelte';
    import MultiSelectField from '../MultiSelectField.svelte';
    import SelectField from '../SelectField.svelte';
    import Toggle from '../Toggle.svelte';
    import { carouselStore } from '../../stores/carousel.store';
    import { user } from '../../stores/user.store';
    import { onMount, onDestroy } from 'svelte';
    import { writable, get, derived } from 'svelte/store';
    import { createModal } from '../Modal/modal.store';
    import { jellyfinApi } from '../../apis/jellyfin/jellyfin-api';
    import { ArrowUp, ArrowDown } from 'radix-icons-svelte';
    import CarouselForm from './CarouselForm.svelte';
    import SelectItemDialog from '../SelectItemDialog.svelte';
    import { jellyfinItemsStore } from '../../stores/data.store';
    import { scrollIntoView } from '../../selectable';
    import { applyFilters, getTitle } from '../Carousel/carouselUtils';

    let newCarousel = writable({
        carouselName: '',
        filterType: [],
        genre: [],
        tag: [],
        sortBy: '',
        libraryPath: [],
        studio: []
    });

    let tempCarousel = writable({
        carouselName: '',
        filterType: [],
        genre: [],
        tag: [],
        sortBy: '',
        libraryPath: [],
        studio: []
    });

    let items = writable([]);

    const filterTypes = [
        { id: 'recent', name: 'Recent release' },
        { id: 'highestRated7Plus', name: 'Highest Rated (7>=)' }
    ];

    const sortOptions = [
        { id: 'recent', name: 'Recent release' },
        { id: 'highestRated', name: 'Highest Rated' },
        { id: 'newest', name: 'Last on Jellyfin' },
        { id: 'random', name: 'Random' }
    ];

    let genres = [];
    let libraries = [];
    let studios = [];
    let tags = [];
    let editCarouselName = false;
    let showPreview = false;
    let loading = true;
    const currentUser = get(user);
    let previewFilteredItems = [];

    

    onMount(async () => {
        try {
            await carouselStore.fetchAllCarousels();
            const [fetchedGenres, fetchedLibraries, result] = await Promise.all([
                jellyfinApi.getGenres(),
                jellyfinApi.getVirtualFolders(),
                jellyfinItemsStore.send()
            ]);

            genres = fetchedGenres.map(({ Name }) => ({ id: Name, name: Name }));
            libraries = fetchedLibraries.map(({ Name, Locations }) => ({ 
                id: Locations[0],
                name: Name,
                path: Locations[0]
            }));

            items.set(Array.isArray(result) ? result : []);
            const { studios: studioList, tags: tagList } = processItemsData(get(items));
            studios = studioList;
            tags = tagList;
            loading = false;
        } catch (error) {
            console.error("Error fetching data from Jellyfin:", error);
            loading = false;
        }
    });

    function countAndFilter(items, minCount) {
        return Object.entries(items)
            .filter(([, count]) => count >= minCount)
            .map(([name, count]) => ({ id: name, name, count }))
            .sort((a, b) => b.count - a.count);
    }

    function processItemsData(items, minCount = 5) {
        const studioCount = {};
        const tagCount = {};

        items.forEach(item => {
            item.Studios?.forEach(({ Name }) => studioCount[Name] = (studioCount[Name] || 0) + 1);
            item.Tags?.forEach(tag => {
                const tagName = typeof tag === 'object' && tag.Name ? tag.Name : tag;
                if (tagName) tagCount[tagName] = (tagCount[tagName] || 0) + 1;
            });
        });

        return { studios: countAndFilter(studioCount, minCount), tags: countAndFilter(tagCount, minCount) };
    }


    
    const unsubscribe = tempCarousel.subscribe(filters => {
        previewFilteredItems = applyFilters(get(items), filters);
    });

    onDestroy(() => {
        unsubscribe(); 
    });

    const mediaCarousels = derived(carouselStore, $carouselStore => $carouselStore || []);

    async function addMediaCarousel() {
        newCarousel.update(nc => ({ ...get(tempCarousel) }));
        const carouselWithId = { ...get(newCarousel) };        
        await carouselStore.createCarousel(carouselWithId);
        newCarousel.set({ carouselName: '', filterType: [], genre: [], tag: [], sortBy: '', libraryPath: [], studio: [] });
        tempCarousel.set({ carouselName: '', filterType: [], genre: [], tag: [], sortBy: '', libraryPath: [], studio: [] });
    }

    async function removeMediaCarousel(id: string) {
        await carouselStore.deleteCarousel(id);
    }

    function openModal(component, options) {
        createModal(component, options);
    }

    function formatArrayToString(arr, items) {
        if (!arr || !Array.isArray(arr)) return '';
        return arr.map(id => items.find(item => item.id === id)?.name || id)
                  .filter(Boolean)
                  .join(', ');
    }

    function moveItem(index: number, direction: number) {
        const carousels = get(carouselStore).slice();

        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < carousels.length) {
            [carousels[index], carousels[targetIndex]] = [carousels[targetIndex], carousels[index]];

            carouselStore.reorderCarousels(carousels);

            console.log(`Moved item from ${index} to ${targetIndex}`);
        } else {
            console.log(`Invalid move: targetIndex ${targetIndex} is out of bounds.`);
        }
    }

    $: derivedCarouselName = editCarouselName 
        ? $tempCarousel.carouselName 
        : getTitle($tempCarousel);

    $: if (!editCarouselName) {
        tempCarousel.update(tc => ({ ...tc, carouselName: derivedCarouselName }));
    }

</script>

<div class="space-y-4">
    <h1 class="font-semibold text-2xl text-secondary-100">Create new carousel</h1>
    <div class="flex space-x-4">
        <Container class="rounded-xl w-2/3" on:enter={scrollIntoView({ top: 9999 })}>
            <Container class="bg-primary-800 rounded-xl p-8" on:enter={scrollIntoView({ top: 9999 })}>
            {#if currentUser?.isAdmin}
                <div class="space-y-4">
                    <Container class="grid grid-cols-2 gap-4" direction="grid" gridCols={2}>
                        <div class="col-span-1">
                            <TextField
                                bind:value={$tempCarousel.carouselName}
                                placeholder={derivedCarouselName}
                                disabled={!editCarouselName}
                            >
                                Carousel Name
                            </TextField>
                        </div>
                        <div class="flex items-center justify-end col-span-1">
                            <label for="toggle-edit-carousel" class="mr-2">Edit carousel name</label>
                            <Toggle
                                id="toggle-edit-carousel"
                                bind:checked={editCarouselName}
                            />
                        </div>
                    </Container>

                    <Container class="grid grid-cols-3 gap-4" direction="grid" gridCols={3}>
                        <SelectField value={formatArrayToString($tempCarousel.libraryPath || [], libraries) || 'All'}
                            on:clickOrSelect={() => openModal(MultiSelectField, { 
                                items: libraries, 
                                selectedItems: writable($tempCarousel.libraryPath), 
                                onConfirm: selected => {
                                    console.log("Updating tempCarousel with selected libraryPath items:", selected); // Debugging
                                    tempCarousel.update(tc => ({ ...tc, libraryPath: selected || [] }));
                                }
                            })}
                            tabindex="0">
                            Library (optional)
                        </SelectField>
                    
                        <SelectField value={formatArrayToString($tempCarousel.filterType || [], filterTypes) || ''}
                            on:clickOrSelect={() => openModal(MultiSelectField, { 
                                items: filterTypes, 
                                selectedItems: writable($tempCarousel.filterType), 
                                onConfirm: selected => tempCarousel.update(tc => ({ ...tc, filterType: selected || [] }))
                            })}
                            tabindex="0">
                            Filter Type (optional)
                        </SelectField>

                        <SelectField value={formatArrayToString($tempCarousel.genre || [], genres) || ''}
                            on:clickOrSelect={() => openModal(MultiSelectField, { 
                                items: genres, 
                                selectedItems: writable($tempCarousel.genre), 
                                onConfirm: selected => tempCarousel.update(tc => ({ ...tc, genre: selected || [] }))
                            })}
                            tabindex="0">
                            Genre (optional)
                        </SelectField>

                        <SelectField value={formatArrayToString($tempCarousel.studio || [], studios) || ''}
                            on:clickOrSelect={() => openModal(MultiSelectField, { 
                                items: studios, 
                                selectedItems: writable($tempCarousel.studio), 
                                onConfirm: selected => tempCarousel.update(tc => ({ ...tc, studio: selected || [] }))
                            })}
                            tabindex="0">
                            Studios (optional)
                        </SelectField>

                        <SelectField value={formatArrayToString($tempCarousel.tag || [], tags) || ''}
                            on:clickOrSelect={() => openModal(MultiSelectField, { 
                                items: tags, 
                                selectedItems: writable($tempCarousel.tag), 
                                onConfirm: selected => tempCarousel.update(tc => ({ ...tc, tag: selected || [] }))
                            })}
                            tabindex="0">
                            Tags (optional)
                        </SelectField>

                        <SelectField value={sortOptions.find(option => option.id === $tempCarousel.sortBy)?.name || ''}
                            on:clickOrSelect={() => openModal(SelectItemDialog, { 
                                items: sortOptions, 
                                selectedItem: sortOptions.find(option => option.id === $tempCarousel.sortBy), 
                                handleSelectItem: selectedItem => tempCarousel.update(tc => ({ ...tc, sortBy: selectedItem?.id || '' }))
                            })}
                            tabindex="0">
                            Sort By (optional)
                        </SelectField>
                    </Container>

                    <div class="flex items-center mt-4 justify-between">
                        <Container class="grid grid-cols-2 gap-4" direction="grid" gridCols={2}>
                            <Button on:clickOrSelect={addMediaCarousel} class="w-full" type="primary-dark">
                                Add carousel
                            </Button>
                            <div class="flex items-center">
                                <label for="toggle-preview" class="mr-2">Preview</label>
                                <Toggle id="toggle-preview" checked={showPreview} on:change={() => (showPreview = !showPreview)} />
                            </div>
                        </Container>
                    </div>    
                </div>
            {/if}
        </Container>
    </Container>

        {#if showPreview}
        <Container class="bg-primary-700 rounded-xl p-8 w-1/3">
            <h2 class="text-lg font-semibold mb-4">Preview (First 5 items of {previewFilteredItems.length})</h2>
            {#if previewFilteredItems.length > 0}
                <ul class="space-y-2">
                    {#each previewFilteredItems.slice(0, 5) as item}
                        <li class="p-2 bg-primary-600 rounded-lg shadow flex space-x-4 items-center">
                            <div class="w-[75px] h-[100px] flex-shrink-0">
                                <img src="{jellyfinApi.getPosterUrl(item, 80)}" alt="{item.Name}" class="w-[75px] h-[100px] rounded-lg object-cover" />
                            </div>
                            <div class="flex-1">
                                <h3 class="text-md font-semibold">{item.Name}</h3>
                                <p class="text-sm text-secondary-300">Genre: {item.Genres ? item.Genres.join(', ') : 'N/A'}</p>
                                <p class="text-sm text-secondary-300">Community Rating: {item.CommunityRating ?? 'N/A'}</p>
                                <p class="text-sm text-secondary-300">Studio: {item.Studios ? item.Studios.map(s => s.Name).join(', ') : 'N/A'}</p>
                            </div>
                        </li>                    
                    {/each}
                </ul>
            {:else}
                <p class="text-sm text-secondary-300">No items match these criteria</p>
            {/if}
        </Container>  
    {/if}   
    </div>
</div>

<div class="space-y-4 pt-8">
    <h1 class="font-semibold text-2xl text-secondary-100 mb-8">Manage carousels</h1>
    <Container class="bg-primary-800 rounded-xl p-4">
        {#if currentUser?.isAdmin}
            <div class="space-y-4 mt-4">
                {#if $mediaCarousels.length > 0}
                    {#each $mediaCarousels as carousel, index (carousel.id)}
                        <Container class="bg-primary-900 rounded-lg p-8 flex items-center space-x-2 mx-4">
                            <div class="flex-shrink-0 w-12 text-3xl font-bold text-primary-500 text-center pr-16">
                                #{index + 1}
                            </div>

                            <div class="flex-grow basis-1/5">
                                <p class="text-lg font-semibold whitespace-normal">
                                    {carousel.carouselName || 'Untitled Carousel'}
                                </p>
                            </div>

                            <div class="flex-grow basis-1/5 text-sm text-secondary-400">
                                <div class="grid grid-cols-2 gap-2 max-w-[20rem] ml-8">
                                    {#if carousel.libraryPath && carousel.libraryPath.length}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Library</p>
                                            <p class="font-bold m-0 break-words">
                                                {formatArrayToString(carousel.libraryPath || [], libraries)}
                                            </p>
                                        </div>
                                    {/if}

                                    {#if carousel.filterType && carousel.filterType.length}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Filter Type</p>
                                            <p class="font-bold m-0 break-words">
                                                {formatArrayToString(carousel.filterType || [], filterTypes)}
                                            </p>
                                        </div>
                                    {/if}

                                    {#if carousel.genre && carousel.genre.length}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Genre</p>
                                            <p class="font-bold m-0 break-words">
                                                {formatArrayToString(carousel.genre || [], genres)}
                                            </p>
                                        </div>
                                    {/if}

                                    {#if carousel.studio && carousel.studio.length}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Studio</p>
                                            <p class="font-bold m-0 break-words">
                                                {formatArrayToString(carousel.studio || [], studios)}
                                            </p>
                                        </div>
                                    {/if}

                                    {#if carousel.tag && carousel.tag.length}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Tag</p>
                                            <p class="font-bold m-0 break-words">
                                                {formatArrayToString(carousel.tag || [], tags)}
                                            </p>
                                        </div>
                                    {/if}
                                    {#if carousel.sortBy}
                                        <div class="space-y-1 max-w-[10rem]">
                                            <p class="m-0">Sort By</p>
                                            <p class="font-bold m-0 break-words">
                                                {sortOptions.find(option => option.id === carousel.sortBy)?.name}
                                            </p>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            <Container class="grid grid-cols-2 gap-4" direction="grid" gridCols={2} on:enter={scrollIntoView({ vertical: 64 })}>
                                <Button on:clickOrSelect={() => openModal(CarouselForm, { initialCarouselData: writable(carousel), onConfirm: updatedCarousel => carouselStore.updateCarousel(carousel.id, updatedCarousel) })} class="bg-red-600 w-full">
                                    Edit
                                </Button>
                                <Button class="buttonRequest small-button w-full" type="primary-dark" on:clickOrSelect={() => moveItem(index, -1)} icon={ArrowUp}></Button>

                                <Button on:clickOrSelect={() => removeMediaCarousel(carousel.id)} class="bg-red-600 w-full">
                                    Remove
                                </Button>
                                <Button class="buttonRequest small-button w-full" type="primary-dark" on:clickOrSelect={() => moveItem(index, 1)} icon={ArrowDown}></Button>
                            </Container>
                        </Container>
                    {/each}
                {:else}
                    <p>No carousels available.</p>
                {/if}
            </div>
        {:else}
            <p class="text-red-500">Access Denied: You do not have permission to manage media carousels.</p>
        {/if}
    </Container>
</div>
