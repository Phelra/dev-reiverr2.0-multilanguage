<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { jellyfinApi } from '../../apis/jellyfin/jellyfin-api';
    import HeroCarousel from '../HeroCarousel/HeroCarousel.svelte';
    import { navigate } from '../StackRouter/StackRouter';
    import CardPlaceholder from '../Card/CardPlaceholder.svelte';

    const dispatch = createEventDispatcher<{ select: any }>();

    const MAX_ITEMS = 10;
    const MIN_RATING = 6;
    const MIN_YEAR = 2000;

    let randomMovies = jellyfinApi.getLibraryItems().then(items => {
        return items
            .filter(item => {
                const isValidRating = item.Type === 'Movie' && (item.CommunityRating || 0) >= MIN_RATING;
                const isValidYear = new Date(item.PremiereDate).getFullYear() >= MIN_YEAR;
                return isValidRating && isValidYear;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_ITEMS);
    });

    let urls = randomMovies.then(movies => 
        movies.map(movie => ({
            backdropUrl: movie.BackdropImageTags?.length
                ? `${jellyfinApi.getBaseUrl()}/Items/${movie.Id}/Images/Backdrop?maxWidth=1920&quality=50&tag=${movie.BackdropImageTags[0]}`
                : `${jellyfinApi.getBaseUrl()}/Items/${movie.Id}/Images/Primary?maxWidth=1920&quality=50&tag=${movie.ImageTags.Primary}`,
            trailerUrl: ''
        }))
    );

    let showcaseIndex = 0;
    
    function getPosterUrl(movie) {
        return `${jellyfinApi.getBaseUrl()}/Items/${movie.Id}/Images/Primary?fillHeight=608&fillWidth=406&quality=30&tag=${movie.ImageTags.Primary}`;
    }

    function descriptionMovie(movie) {
        const OriginalDescription = movie.Overview || movie.Taglines?.join(' ') || movie.ShortDescription;
        if (!OriginalDescription) {
            return 'Description non disponible.';
        }

        const phrases = OriginalDescription.match(/[^\.!\?]+[\.!\?]+/g) || [];
        return phrases.length >= 2 ? phrases.slice(0, 2).join(' ') : OriginalDescription || 'Description courte non disponible.';
    }

    async function onSelect() {
        randomMovies.then(movies => {
            const movie = movies[showcaseIndex];
            
            if (!movie?.Id) {
                console.error('Movie ID is invalid or undefined:', movie);
                return;
            }

            const tmdbId = movie.ProviderIds?.Tmdb;
            if (!tmdbId) {
                console.error('TMDB ID not found for movie:', movie);
                return;
            }

            navigate(`/movie/${tmdbId}`);
        }).catch(error => {
            console.error('Failed to retrieve or process movies:', error);
        });
    }
</script>

<HeroCarousel
    urls={urls}
    bind:index={showcaseIndex}
    on:enter
    on:select={onSelect}
>
    <div class="h-full flex-1 flex overflow-hidden z-10 relative">
        {#await randomMovies}
        {:then movies}
            {@const movie = movies[showcaseIndex]}
            {#if movie}
                <div class="flex-1 flex items-end">
                    <div class="mr-8">
                        {#if movie.ImageTags.Primary}
                            <div
                                class="bg-center bg-cover rounded-xl w-44 h-64 cursor-pointer"
                                style={`background-image: url("${getPosterUrl(movie)}")`}
                                on:click={onSelect}
                            />
                        {:else}
                            <CardPlaceholder size="md" />
                        {/if}
                    </div>
                    <div class="flex flex-col">
                        <div
                            class="text-left font-medium tracking-wider text-stone-200 hover:text-amber-200 max-w-xl mt-2"
                            style={`font-size: ${movie.Name.length < 15 ? '2rem' : '1.5rem'}`}
                            on:click={onSelect}
                        >
                            {movie.Name || 'No Title'}
                        </div>
                        <div
                            class="flex items-center gap-1 uppercase text-zinc-300 font-semibold tracking-wider mt-2"
                        >
                            <p class="flex-shrink-0">{new Date(movie.PremiereDate).getFullYear()}</p>
                            <span> • </span>
                            <p class="flex-shrink-0">{movie.CommunityRating || 'N/A'} Rating</p>
                        </div>
                        <div class="text-stone-300 font-medium line-clamp-3 opacity-75 max-w-2xl mt-4">
                            {descriptionMovie(movie)}
                        </div>
                    </div>
                </div>
            {/if}
        {:catch error}
            <p>{error.message}</p>
        {/await}
    </div>
</HeroCarousel>
