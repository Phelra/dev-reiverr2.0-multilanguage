<script lang="ts">
    import TextField from '../TextField.svelte';
    import MultiSelectField from '../MultiSelectField.svelte';
    import SelectField from '../SelectField.svelte';
    import Button from '../Button.svelte';
    import Container from '../../../Container.svelte';
    import Dialog from '../Dialog/Dialog.svelte';
    import { writable, derived } from 'svelte/store';
    import { onMount } from 'svelte';
    import { createModal } from '../Modal/modal.store';
    import { jellyfinApi } from '../../apis/jellyfin/jellyfin-api';
    
    export let initialCarouselData = writable({
        carouselName: '',
        filterType: [],
        genre: [],
        tag: '',
        sortBy: [],
        libraryPath: [],
        studio: []
    });
    export let onConfirm = (carousel) => {};

    // State for the carousel with reactive data from the initial input
    let carousel = { ...$initialCarouselData };

    // Local data arrays for selection options
    let genres = [];
    let studios = [];
    let tags = [];
    let libraries = writable([]);
    const filterTypes = [
        { id: 'recent', name: 'Recent release' },
        { id: 'highestRated', name: 'Highest Rated (7>=)' }
    ];
    const sortOptions = [
        { id: 'recent', name: 'Recent release' },
        { id: 'highestRated', name: 'Highest Rated' },
        { id: 'newest', name: 'Last on Jellyfin' },
        { id: 'random', name: 'Random' }
    ];

    // Fetch genres, studios, tags, and libraries on mount
    onMount(async () => {
        try {
            const [fetchedGenres, fetchedLibraries, fetchedStudios, fetchedTags] = await Promise.all([
                jellyfinApi.getGenres(),
                jellyfinApi.getVirtualFolders(),
                jellyfinApi.getStudios(),
                jellyfinApi.getTags()
            ]);

            genres = fetchedGenres.map(({ Name }) => ({ id: Name, name: Name }));
            studios = fetchedStudios.map(({ Name }) => ({ id: Name, name: Name }));
            tags = fetchedTags.map(({ Name }) => ({ id: Name, name: Name }));
            libraries.set(fetchedLibraries.map(({ Name, Locations }) => ({ 
                id: Locations[0],
                name: Name,
                path: Locations[0]
            })));
        } catch (error) {
            console.error("Error fetching data from Jellyfin:", error);
        }
    });

    // Handler for confirmation of carousel data
    function confirm() {
        onConfirm(carousel);
    }

    // Open modals for selection and handle selection updates
    function openFilterTypeModal() {
        createModal(MultiSelectField, {
            items: filterTypes,
            selectedItems: writable(carousel.filterType),
            onConfirm: (selectedItems) => {
                carousel.filterType = Array.isArray(selectedItems) ? selectedItems : [];
            }
        });
    }

    function openGenreModal() {
        createModal(MultiSelectField, {
            items: genres,
            selectedItems: writable(carousel.genre),
            onConfirm: (selectedItems) => {
                carousel.genre = Array.isArray(selectedItems) ? selectedItems : [];
            }
        });
    }

    function openSortByModal() {
        createModal(MultiSelectField, {
            items: sortOptions,
            selectedItems: writable(carousel.sortBy),
            onConfirm: (selectedItems) => {
                carousel.sortBy = Array.isArray(selectedItems) ? selectedItems : [];
            }
        });
    }

    function openLibraryModal() {
        libraries.subscribe((libs) => {
            createModal(MultiSelectField, {
                items: libs,
                selectedItems: writable(carousel.libraryPath),
                onConfirm: (selectedItems) => {
                    carousel.libraryPath = Array.isArray(selectedItems) ? selectedItems : [];
                }
            });
        });
    }

    function openStudioModal() {
        createModal(MultiSelectField, {
            items: studios,
            selectedItems: writable(carousel.studio),
            onConfirm: (selectedItems) => {
                carousel.studio = Array.isArray(selectedItems) ? selectedItems : [];
            }
        });
    }

    function openTagModal() {
        createModal(MultiSelectField, {
            items: tags,
            selectedItems: writable(carousel.tag),
            onConfirm: (selectedItems) => {
                carousel.tag = Array.isArray(selectedItems) ? selectedItems : [];
            }
        });
    }

    // Reactive derived labels for dropdown display values
    const libraryLabel = derived([libraries, writable(carousel.libraryPath)], ([$libraries, $libraryPath]) => {
        return Array.isArray($libraryPath)
            ? $libraryPath.map(libPath => $libraries.find(lib => lib.path === libPath)?.name).filter(Boolean).join(', ')
            : 'Select Library';
    });

    function getFilterTypeLabel() {
        return Array.isArray(carousel.filterType)
            ? carousel.filterType.map(ft => filterTypes.find(type => type.id === ft)?.name).filter(Boolean).join(', ')
            : 'Select Filter Type';
    }

    function getGenreLabel() {
        return Array.isArray(carousel.genre)
            ? carousel.genre.join(', ')
            : 'Select Genre';
    }

    function getSortByLabel() {
        return Array.isArray(carousel.sortBy)
            ? carousel.sortBy.map(sb => sortOptions.find(option => option.id === sb)?.name).filter(Boolean).join(', ')
            : 'Select Sort By';
    }

    function getStudioLabel() {
        return Array.isArray(carousel.studio)
            ? carousel.studio.join(', ')
            : 'Select Studio';
    }

    function getTagLabel() {
        return Array.isArray(carousel.tag)
            ? carousel.tag.join(', ')
            : 'Select Tag';
    }
</script>

<Dialog>
    <Container class="space-y-4">
        <!-- Carousel Name Input -->
        <TextField bind:value={carousel.carouselName}>
            Name carousel
        </TextField>

        <!-- Selection fields for Library and Filter Type -->
        <div class="grid grid-cols-2 gap-4">
            <SelectField value={$libraryLabel} on:clickOrSelect={openLibraryModal}>
                Library (optional)
            </SelectField>

            <SelectField value={getFilterTypeLabel()} on:clickOrSelect={openFilterTypeModal}>
                Filter Type (optional)
            </SelectField>
        </div>

        <!-- Selection fields for Genre and Sort By -->
        <div class="grid grid-cols-2 gap-4">
            <SelectField value={getGenreLabel()} on:clickOrSelect={openGenreModal}>
                Genre (optional)
            </SelectField>

            <SelectField value={getSortByLabel()} on:clickOrSelect={openSortByModal}>
                Sort By (optional)
            </SelectField>
        </div>

        <!-- Selection fields for Studio and Tag -->
        <div class="grid grid-cols-2 gap-4">
            <SelectField value={getStudioLabel()} on:clickOrSelect={openStudioModal}>
                Studio (optional)
            </SelectField>

            <SelectField value={getTagLabel()} on:clickOrSelect={openTagModal}>
                Tag (optional)
            </SelectField>
        </div>

        <!-- Confirm Button -->
        <Button on:clickOrSelect={confirm} type="primary-dark">Save Carousel</Button>
    </Container>
</Dialog>
