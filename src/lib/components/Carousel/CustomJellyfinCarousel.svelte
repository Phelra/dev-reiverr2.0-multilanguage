<script lang="ts">
    import JellyfinCard from '../Card/JellyfinCard.svelte';
    import Carousel from './Carousel.svelte';
    import { scrollIntoView } from '../../selectable';
    import CardPlaceholder from '../Card/CardPlaceholder.svelte';
    import Button from '../Button.svelte';
    import { navigate } from '../StackRouter/StackRouter';
    import { applyFilters, getTitle } from '../Carousel/carouselUtils';

    export let items = [];
    export let loading = true;
    export let carousel = {
        carouselName: '',
        filterType: [],
        genre: undefined,
        tag: undefined,
        studio: undefined,
        sortBy: [],
        libraryPath: undefined
    };
    export let maxItems = 15;

    let filteredItems = [];
    let title = '';

    const { carouselName, filterType, genre, tag, studio, sortBy, libraryPath } = carousel;

    $: if (!loading && items.length) {
        const filterConfig = { genre, tag, studio, filterType, sortBy, libraryPath };
        filteredItems = applyFilters(items, filterConfig).slice(0, maxItems);
        title = carouselName || getTitle(filterConfig);
    }

    function redirectToLoadMore() {
        navigate(`/loadmore/${carousel.id}`, { replaceStack: false });
    }
</script>

{#if !loading && filteredItems.length > 0}
    <Carousel scrollClass="px-32" on:enter={scrollIntoView({ vertical: 128 })}>
        <span slot="header">{title}</span>
        {#each filteredItems as item (item.Id)}
            <JellyfinCard on:enter={scrollIntoView({ horizontal: 128 })} size="lg" {item} />
        {/each}
        
        {#if filteredItems.length === maxItems && items.length > maxItems}
            <Button on:enter={scrollIntoView({ horizontal: 128 })} on:click={redirectToLoadMore} type="primary">Show more</Button>
        {/if}
    </Carousel>
{:else if loading}
    <div class="loading-container">
        <Carousel scrollClass="px-32" on:enter={scrollIntoView({ vertical: 128 })}>
            <span slot="header"> </span>
            {#each Array(10) as _, i (i)}
                <CardPlaceholder size="lg" index={i} orientation="portrait" />
            {/each}
        </Carousel>
    </div>
{/if}
