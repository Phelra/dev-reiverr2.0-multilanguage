export const TMDB_API_KEY =
	'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmMzMxMTQyM2RmMDA2Y2ZiNThmZTM0NWY0Yzc4YjhkYyIsIm5iZiI6MTczMTg0MDA1OC4xMDM4NDA4LCJzdWIiOiI2NjUxYzQwNWVmMmIzZjhjZDUyMzE2YTMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.UE18MJkNPnvLU3Cy25kV9lwd5smDywqCixciZEAv_0w';
export const TMDB_IMAGES_ORIGINAL = 'https://www.themoviedb.org/t/p/original';
export const TMDB_BACKDROP_SMALL = 'https://www.themoviedb.org/t/p/w780';
export const TMDB_POSTER_SMALL = 'https://www.themoviedb.org/t/p/w342';
export const TMDB_PROFILE_SMALL = 'https://www.themoviedb.org/t/p/w185';
export const TMDB_PROFILE_LARGE = 'https://www.themoviedb.org/t/p/h632';

export const PLACEHOLDER_BACKDROP = '/placeholder.jpg';

export const PLATFORM_TV: boolean = import.meta.env.VITE_PLATFORM === 'tv';
export const PLATFORM_WEB: boolean = !PLATFORM_TV;
