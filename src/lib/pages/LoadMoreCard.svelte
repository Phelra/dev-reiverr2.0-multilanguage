<script lang="ts">
    import { get, writable } from 'svelte/store';
    import CardGrid from '../components/CardGrid.svelte';
    import JellyfinCard from '../components/Card/JellyfinCard.svelte';
    import DetachedPage from '../components/DetachedPage/DetachedPage.svelte';
    import { carouselStore } from '../stores/carousel.store';
    import { jellyfinApi } from '../apis/jellyfin/jellyfin-api';
    import CarouselPlaceholderItems from '../components/Carousel/CarouselPlaceholderItems.svelte';
    import { onMount } from 'svelte';
    import { scrollIntoView } from '../selectable';
    import { applyFilters } from '../components/Carousel/carouselUtils';

    const displayedItems = writable([]);
    const ITEMS_PER_PAGE = 12;
    let currentIndex = 0, allItems = [], totalItemsCount = 0;

    let filterConfig = {
        filterType: [], genre: [], tag: [], studio: [], sortBy: [], libraryPath: []
    };

    const carouselId = parseInt(decodeURIComponent(window.location.pathname.split('/').pop() || ''), 10);
    let carouselName = '';

    async function initializeFilters() {
        let carousels = get(carouselStore);
        if (!carousels.length) {
            await carouselStore.fetchAllCarousels();
            carousels = get(carouselStore);
        }
        const matchedCarousel = carousels.find(c => c.id === carouselId);
        if (matchedCarousel) {
            carouselName = matchedCarousel.carouselName || 'Unnamed Carousel';
            filterConfig = {
                filterType: matchedCarousel.filterType || [],
                genre: matchedCarousel.genre || [],
                tag: matchedCarousel.tag || [],
                studio: matchedCarousel.studio || [],
                sortBy: matchedCarousel.sortBy ? [matchedCarousel.sortBy] : [],
                libraryPath: matchedCarousel.libraryPath || [],
            };
            loadAllItems();
        }
    }

    async function loadAllItems() {
        if (allItems.length > 0) return;
        try {
            const items = await jellyfinApi.getLibraryItems();
            allItems = applyFilters(items, filterConfig);
            totalItemsCount = allItems.length;
            loadMoreItems();
        } catch (error) {
            console.error("Error loading items from Jellyfin API:", error);
        }
    }

    function loadMoreItems() {
        const newItems = allItems.slice(currentIndex, currentIndex + ITEMS_PER_PAGE);
        if (newItems.length) {
            displayedItems.update(curr => [...curr, ...newItems]);
            currentIndex += ITEMS_PER_PAGE;
        }
    }

    function observerCallback(entries) {
        if (entries.some(entry => entry.isIntersecting)) {
            loadMoreItems();
        }
    }

    onMount(() => {
        initializeFilters();
        const sentinel = document.querySelector('#sentinel');
        if (sentinel) {
            const observer = new IntersectionObserver(observerCallback, { root: null, rootMargin: '0px', threshold: 1.0 });
            observer.observe(sentinel);
            return () => observer.unobserve(sentinel);
        }
    });
</script>

<DetachedPage class="py-16 space-y-8">
    <div class="px-32">
        <div class="mb-6">
            <div class="header2">{carouselName} ({totalItemsCount} medias)</div>
        </div>
        <CardGrid>
            {#if $displayedItems.length === 0}
                <CarouselPlaceholderItems size="dynamic" orientation="portrait"/>
            {:else}
                {#each $displayedItems as item}
                    <JellyfinCard on:enter={scrollIntoView({ all: 64 })} {item} size="sm" />
                {/each}
            {/if}
        </CardGrid>
        <div id="sentinel" style="height: 1px;"></div>
    </div>
</DetachedPage>
