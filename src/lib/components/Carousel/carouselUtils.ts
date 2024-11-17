export function applyFilters(items, filterConfig) {
    const filters = {
        filterHighestRated: (items) => items.filter(item => (item.CommunityRating || 0) >= 7),
        sortHighestRated: (items) => items.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0)),
        recent: (items) => items.sort((a, b) => new Date(b.PremiereDate || 0).getTime() - new Date(a.PremiereDate || 0).getTime()),
        random: (items) => items.sort(() => Math.random() - 0.5),
        newest: (items) => items.sort((a, b) => new Date(b.DateCreated || 0).getTime() - new Date(a.DateCreated || 0).getTime()),
        genre: (items, genres) => {
            const genreArray = Array.isArray(genres) ? genres : [genres];
            return genreArray.length ? items.filter(item => item.Genres?.some(g => genreArray.includes(g))) : items;
        },
        tag: (items, tagString) => {
            const tags = Array.isArray(tagString) ? tagString : [tagString];
            return tags.length ? items.filter(item => item.Tags?.some(t => tags.includes(t))) : items;
        },
        studio: (items, studios) => {
            const studioArray = Array.isArray(studios) ? studios : [studios];
            return studioArray.length ? items.filter(item => item.Studios?.some(s => studioArray.includes(s.Name))) : items;
        },
        libraryPath: (items, paths) => {
            const pathArray = Array.isArray(paths) ? paths : [paths];
            return pathArray.length ? items.filter(item => pathArray.some(path => item.Path?.startsWith(path))) : items;
        }
    };

    let filteredItems = items;

    // Apply filters based on filterConfig
    if (filterConfig.libraryPath?.length) {
        filteredItems = filters.libraryPath(filteredItems, filterConfig.libraryPath);
    }

    if (filterConfig.filterType.includes('highestRated7Plus')) {
        filteredItems = filters.filterHighestRated(filteredItems);
    }

    if (filterConfig.genre?.length) {
        filteredItems = filters.genre(filteredItems, filterConfig.genre);
    }

    if (filterConfig.tag?.length) {
        filteredItems = filters.tag(filteredItems, filterConfig.tag);
    }

    if (filterConfig.studio?.length) {
        filteredItems = filters.studio(filteredItems, filterConfig.studio);
    }

    // Sorting
    if (filterConfig.sortBy?.includes('highestRated')) {
        filteredItems = filters.sortHighestRated(filteredItems);
    } else if (filterConfig.sortBy?.includes('recent')) {
        filteredItems = filters.recent(filteredItems);
    } else if (filterConfig.sortBy?.includes('newest')) {
        filteredItems = filters.newest(filteredItems);
    } else if (filterConfig.sortBy?.includes('random')) {
        filteredItems = filters.random(filteredItems);
    }

    return filteredItems;
}


export function getTitle(filterConfig) {
    const { genre, tag, sortBy, libraryPath } = filterConfig;
    let titleParts = [];

        titleParts.push('Movies');

    if (genre) {
        const genreString = Array.isArray(genre) ? genre.join(' & ') : genre;
        titleParts.push(genreString);
    }

    if (tag) {
        const tagString = Array.isArray(tag) ? tag.join(' & ') : tag;
        if (tagString.toLowerCase().includes('classic')) {
            titleParts.unshift('Classic');
        } else if (tagString.toLowerCase().includes('popular')) {
            titleParts.unshift('Popular');
        } else {
            titleParts.push(tagString);
        }
    }

    if (sortBy.includes('highestRated')) {
        titleParts.unshift('Top Rated');
    } else if (sortBy.includes('recent')) {
        titleParts.unshift('Recently Added');
    } else if (sortBy.includes('newest')) {
        titleParts.unshift('New Arrivals');
    } else if (sortBy.includes('random')) {
        titleParts.unshift('Discover');
    }

    if (titleParts.length === 0) {
        return 'Movies Collection';
    }

    return titleParts.join(' ').replace(/ +/g, ' ');
}