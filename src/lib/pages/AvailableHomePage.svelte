<script lang="ts">
    import Container from '../../Container.svelte';
    import JellyfinHeroCarousel from '../components/HeroShowcase/JellyfinHeroShowcase.svelte';
    import { scrollIntoView } from '../selectable';
    import { jellyfinApi } from '../apis/jellyfin/jellyfin-api';
    import JellyfinCard from '../components/Card/JellyfinCard.svelte';
    import { navigate } from '../components/StackRouter/StackRouter';
    import DetachedPage from '../components/DetachedPage/DetachedPage.svelte';
    import Carousel from '../components/Carousel/Carousel.svelte';
    import { jellyfinItemsStore } from '../stores/data.store';
    import CustomJellyfinCarousel from '../components/Carousel/CustomJellyfinCarousel.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { carouselStore } from '../stores/carousel.store';

    const MAX_ITEMS = 15;
    let items = [];
    let loading = true;
    let heroCarouselLoaded = false;
    let apiCallCounter = 1;
    let mediaCarousels = [];

    console.log("[AvailableHomePage] Initializing component.");

    onMount(() => {
        console.log("[AvailableHomePage] Calling fetchAllCarousels...");
        carouselStore.fetchAllCarousels().then(() => {
            console.log("[AvailableHomePage] fetchAllCarousels completed.");
        }).catch(error => {
            console.error("[AvailableHomePage] Error fetching carousels:", error);
        });
    });

    const unsubscribeItems = jellyfinItemsStore.subscribe(({ data, loading: isLoading }) => {
        items = data || [];
        loading = isLoading;
        console.log("[jellyfinItemsStore] Updated - items count:", items.length, "loading:", loading);
    });
    onDestroy(() => {
        console.log("[jellyfinItemsStore] Unsubscribed.");
        unsubscribeItems();
    });

    const unsubscribeMediaCarousels = carouselStore.subscribe(carousels => {
        mediaCarousels = carousels;
        console.log("[carouselStore] Carousels updated - count:", mediaCarousels.length);
        if (mediaCarousels.length === 0) {
            console.warn("[carouselStore] No carousels found after fetch.");
        }
    });
    onDestroy(() => {
        console.log("[carouselStore] Unsubscribed.");
        unsubscribeMediaCarousels();
    });

    const heroMoviesPromise = jellyfinItemsStore.send().then(() => {
        heroCarouselLoaded = true;
        const filteredItems = items.filter(item => item.Type === 'Movie' && (item.CommunityRating || 0) >= 6);
        console.log("[heroMoviesPromise] Loaded hero movies - count:", filteredItems.length);
        return filteredItems;
    }).catch(error => {
        console.error("[heroMoviesPromise] Error loading hero movies:", error);
        heroCarouselLoaded = true;
        return [];
    });

    const continueWatchingPromise = jellyfinApi.getContinueWatching('movie')
        .then(items => {
            apiCallCounter++;
            console.log(`[continueWatchingPromise] Loaded on call ${apiCallCounter} - items count:`, items.length);
            return items.slice(0, MAX_ITEMS);
        })
        .catch(error => {
            console.error("[continueWatchingPromise] Error loading Continue Watching items:", error);
            return [];
        });
</script>

<DetachedPage class="flex flex-col relative">
    {#await heroMoviesPromise then heroMovies}
        <div class="h-[calc(100vh-12rem)] flex px-32">
            <JellyfinHeroCarousel
                items={heroMovies}
                on:enter={scrollIntoView({ top: 0 })}
                on:select={({ detail }) => {
                    console.log("[JellyfinHeroCarousel] Selected movie ID:", detail?.Id);
                    navigate(`/movie/${detail?.Id}`);
                }}
            />
        </div>
        {#if heroMovies.length === 0}
            <p class="text-yellow-500">No hero movies found. Please check the data source.</p>
        {/if}
    {:catch error}
        <p class="text-red-500">Error loading hero movies: {error.message}</p>
    {/await}

    {#if heroCarouselLoaded && !loading}
        <div class="my-16 space-y-8">
            {#await continueWatchingPromise then continueWatchingItems}
                {#if continueWatchingItems?.length}
                    <Carousel scrollClass="px-32" on:enter={scrollIntoView({ vertical: 128 })}>
                        <span slot="header">Continue Watching</span>
                        {#each continueWatchingItems as item (item.Id)}
                            <JellyfinCard on:enter={scrollIntoView({ horizontal: 128 })} size="lg" {item} />
                        {/each}
                    </Carousel>
                {:else}
                    <p class="text-yellow-500">No items to continue watching.</p>
                {/if}
            {:catch error}
                <p class="text-red-500">Error loading Continue Watching items: {error.message}</p>
            {/await}

            {#if mediaCarousels.length > 0}
                {#each mediaCarousels as carousel}
                <CustomJellyfinCarousel
                items={items}
                loading={loading}
                carousel={carousel}
                on:loaded={() => console.log(`[CustomJellyfinCarousel] Loaded custom carousel: ${carousel.carouselName}`)}
            />            
                {/each}
            {:else}
                <p class="text-yellow-500">No custom carousels found in carouselStore.</p>
            {/if}
        </div>
    {:else}
    {/if}
</DetachedPage>
