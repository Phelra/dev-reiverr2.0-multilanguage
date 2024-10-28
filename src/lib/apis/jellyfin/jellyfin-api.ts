import createClient from 'openapi-fetch';
import { get } from 'svelte/store';
import type { components, paths } from './jellyfin.generated';
import type { Api } from '../api.interface';
import { user } from '../../stores/user.store';
import { generalSettings } from '../../stores/generalSettings.store';
import type { DeviceProfile } from './playback-profiles';
import axios from 'axios';

export type JellyfinItem = components['schemas']['BaseItemDto'];
export type JellyfinUser = components['schemas']['UserDto'];

type Type = 'movie' | 'series';

export const JELLYFIN_DEVICE_ID = 'Reiverr Client';

export class JellyfinApi implements Api<paths> {
getClient() {
    const jellyfinSettings = get(generalSettings)?.data?.integrations?.jellyfin;
    const baseUrl = jellyfinSettings?.baseUrl;
    const apiKey = jellyfinSettings?.apiKey;

    return createClient<paths>({
        baseUrl,
        headers: {
            Authorization: `MediaBrowser DeviceId="${JELLYFIN_DEVICE_ID}", Token="${apiKey}"`
        }
    });
}

getUserId() {
    return get(user)?.settings.jellyfin.userId || '';
}

getApiKey() {
    return get(generalSettings)?.data?.integrations?.jellyfin?.apiKey || '';
}

getBaseUrl() {
    return get(generalSettings)?.data?.integrations?.jellyfin?.baseUrl || '';
}

getContinueWatching = async (type?: Type): Promise<JellyfinItem[] | undefined> =>
    this.getClient()
        .GET('/Users/{userId}/Items/Resume', {
            params: {
                path: {
                    userId: this.getUserId()
                },
                query: {
                    mediaTypes: ['Video'],
                    fields: ['ProviderIds', 'Genres'],
                    ...(type ? { parentId: await this.getViewId(type) } : {})
                }
            }
        })
        .then((r) => r.data?.Items || []);

getContinueWatchingSeries = async () => {
    const seriesIds = [
        ...new Set([
            ...(await this.getContinueWatching('series')
                .then((items) => items?.map((i) => i.SeriesId) || [])
                .then((ids) => ids.filter((i) => !!i) as string[])),
            ...(await this.getJellyfinNextUp()
                .then((items) => items?.map((i) => i.SeriesId) || [])
                .then((ids) => ids.filter((i) => !!i) as string[]))
        ])
    ];

    return Promise.all(seriesIds.map((id) => this.getLibraryItem(id))).then((is) =>
        is.filter((i): i is JellyfinItem => !!i)
    );
};

jellyfinItemsCache: JellyfinItem[] = [];
async getLibraryItems(refreshCache = false) {
    if (refreshCache || !this.jellyfinItemsCache.length) {
        this.jellyfinItemsCache =
            (await this.getClient()
                .GET('/Users/{userId}/Items', {
                    params: {
                        path: {
                            userId: this.getUserId()
                        },
                        query: {
                            hasTmdbId: true,
                            recursive: true,
                            includeItemTypes: ['Movie', 'Series'],
                            fields: [
                                'ProviderIds',
                                'Genres',
                                'DateLastMediaAdded',
                                'DateCreated',
                                'MediaSources',
                                'Overview'
                            ]
                        }
                    }
                })
                .then((r) => r.data?.Items || [])) || Promise.resolve([]);
    }

    return this.jellyfinItemsCache;
}

getPosterUrl(item: JellyfinItem, quality = 100, original = false) {
    const baseUrl = get(generalSettings)?.data?.integrations?.jellyfin?.baseUrl || '';
    return item.ImageTags?.Primary
        ? `${baseUrl}/Items/${
                item?.Id
          }/Images/Primary?quality=${quality}${original ? '' : '&fillWidth=432'}&tag=${
                item?.ImageTags?.Primary
          }`
        : '';
}

async getLibraryItem(itemId: string, refreshCache = false) {
    const item = await this.getLibraryItems(refreshCache).then((items) =>
        items.find((i) => i.Id === itemId)
    );

    if (item) return item;

    return this.getClient()
        .GET('/Users/{userId}/Items/{itemId}', {
            params: {
                path: {
                    itemId,
                    userId: this.getUserId()
                }
            }
        })
        .then((r) => r.data);
}

getLibraryItemFromTmdbId(tmdbId: string, refreshCache = false) {
    return this.getLibraryItems(refreshCache).then((items) =>
        items.find((i) => i.ProviderIds?.Tmdb === tmdbId)
    );
}

getPlaybackInfo = async (
    itemId: string,
    playbackProfile: DeviceProfile,
    startTimeTicks = 0,
    maxStreamingBitrate = 140000000,
    audioStreamIndex?: number
) =>
    this.getClient()
        .POST('/Items/{itemId}/PlaybackInfo', {
            params: {
                path: {
                    itemId: itemId
                },
                query: {
                    userId: this.getUserId(),
                    startTimeTicks,
                    autoOpenLiveStream: true,
                    maxStreamingBitrate,
                    ...(audioStreamIndex ? { audioStreamIndex } : {}),
                    mediaSourceId: itemId
                }
            },
            body: {
                DeviceProfile: playbackProfile
            }
        })
        .then((r) => ({
            playbackUri:
                r.data?.MediaSources?.[0]?.TranscodingUrl ||
                `/Videos/${r.data?.MediaSources?.[0]?.Id}/stream.mp4?Static=true&mediaSourceId=${
                    r.data?.MediaSources?.[0]?.Id
                }&deviceId=${JELLYFIN_DEVICE_ID}&api_key=${this.getApiKey()}&Tag=${
                    r.data?.MediaSources?.[0]?.ETag
                }`,
            mediaSourceId: r.data?.MediaSources?.[0]?.Id,
            playSessionId: r.data?.PlaySessionId,
            directPlay:
                !!r.data?.MediaSources?.[0]?.SupportsDirectPlay ||
                !!r.data?.MediaSources?.[0]?.SupportsDirectStream
        }));

reportPlaybackStarted(
    itemId: string,
    sessionId: string,
    mediaSourceId: string,
    audioStreamIndex?: number,
    subtitleStreamIndex?: number
) {
    return this.getClient()?.POST('/Sessions/Playing', {
        body: {
            CanSeek: true,
            ItemId: itemId,
            PlaySessionId: sessionId,
            MediaSourceId: mediaSourceId,
            AudioStreamIndex: audioStreamIndex || 1,
            SubtitleStreamIndex: subtitleStreamIndex || -1
        }
    });
}

reportPlaybackProgress(
    itemId: string,
    sessionId: string,
    isPaused: boolean,
    positionTicks: number
) {
    return this.getClient()?.POST('/Sessions/Playing/Progress', {
        body: {
            ItemId: itemId,
            PlaySessionId: sessionId,
            IsPaused: isPaused,
            PositionTicks: Math.round(positionTicks),
            CanSeek: true,
            MediaSourceId: itemId
        }
    });
}

reportPlaybackStopped(itemId: string, sessionId: string, positionTicks: number) {
    return this.getClient()?.POST('/Sessions/Playing/Stopped', {
        body: {
            ItemId: itemId,
            PlaySessionId: sessionId,
            PositionTicks: Math.round(positionTicks),
            MediaSourceId: itemId
        }
    });
}

deleteActiveEncoding(playSessionId: string) {
    return this.getClient()?.DELETE('/Videos/ActiveEncodings', {
        params: {
            query: {
                deviceId: JELLYFIN_DEVICE_ID,
                playSessionId: playSessionId
            }
        }
    });
}


getJellyfinEpisodesInSeasons = async (seriesId: string) =>
    this.getJellyfinEpisodes(seriesId).then((items) => {
        const seasons: Record<string, JellyfinItem[]> = {};

        items?.forEach((item) => {
            const seasonNumber = item.ParentIndexNumber || 0;

            if (!seasons[seasonNumber]) {
                seasons[seasonNumber] = [];
            }

            seasons[seasonNumber]?.push(item);
        });

        return seasons;
    });

markAsWatched = async (jellyfinId: string) =>
    this.getClient()
        .POST('/Users/{userId}/PlayedItems/{itemId}', {
            params: {
                path: {
                    userId: this.getUserId(),
                    itemId: jellyfinId
                },
                query: {
                    datePlayed: new Date().toISOString()
                }
            }
        })
        .then((res) => res.response.status === 200);

markAsUnwatched = async (jellyfinId: string) =>
    this.getClient()
        .DELETE('/Users/{userId}/PlayedItems/{itemId}', {
            params: {
                path: {
                    userId: this.getUserId(),
                    itemId: jellyfinId
                }
            }
        })
        .then((res) => res.response.status === 200);

getGenres = async (): Promise<{ Id: string; Name: string }[]> => {
    return this.getClient()
        .GET('/Genres', {
            params: {
                query: {
                    userId: this.getUserId(),
                }
            }
        })
        .then((r) => r.data?.Items || []);
};

	// getJellyfinSeries = () =>
	// 	JellyfinApi.get('/Users/{userId}/Items', {
	// 		params: {
	// 			path: {
	// 				userId: PUBLIC_JELLYFIN_USER_ID || ''
	// 			},
	// 			query: {
	// 				hasTmdbId: true,
	// 				recursive: true,
	// 				includeItemTypes: ['Series']
	// 			}
	// 		}
	// 	}).then((r) => r.data?.Items || []);

	// getJellyfinSeries = () =>
	// 	JellyfinApi.get('/Users/{userId}/Items', {
	// 		params: {
	// 			path: {
	// 				userId: PUBLIC_JELLYFIN_USER_ID || ''
	// 			},
	// 			query: {
	// 				hasTmdbId: true,
	// 				recursive: true,
	// 				includeItemTypes: ['Series']
	// 			}
	// 		}
	// 	}).then((r) => r.data?.Items || []);

    episodesCache: JellyfinItem[] = [];
    getEpisode = async (
        seriesId: string,
        season: number,
        episode: number,
        refreshCache = false
    ): Promise<JellyfinItem | undefined> =>
        this.getClient()
            .GET('/Users/{userId}/Items', {
                params: {
                    path: {
                        userId: this.getUserId()
                    },
                    query: {
                        seriesId,
                        parentIndexNumber: season,
                        indexNumber: episode,
                        recursive: true,
                        includeItemTypes: ['Episode'],
                        fields: ['ProviderIds', 'Genres', 'DateLastMediaAdded', 'DateCreated', 'MediaSources']
                    }
                }
            })
            .then((r) =>
                r.data?.Items?.find(
                    (i) =>
                        i?.ParentIndexNumber === season &&
                        i?.IndexNumber === episode &&
                        i?.SeriesId === seriesId
                )
            );

    getJellyfinEpisodes = async (parentId = '') =>
        this.getClient()
            ?.GET('/Users/{userId}/Items', {
                params: {
                    path: {
                        userId: this.getUserId()
                    },
                    query: {
                        recursive: true,
                        includeItemTypes: ['Episode'],
                        parentId
                    }
                },
                headers: {
                    'cache-control': 'max-age=10'
                }
            })
            .then((r) => r.data?.Items || []) || [];

    getJellyfinEpisodesInSeasons = async (seriesId: string) =>
        this.getJellyfinEpisodes(seriesId).then((items) => {
            const seasons: Record<string, JellyfinItem[]> = {};

            items?.forEach((item) => {
                const seasonNumber = item.ParentIndexNumber || 0;

                if (!seasons[seasonNumber]) {
                    seasons[seasonNumber] = [];
                }

                seasons[seasonNumber]?.push(item);
            });

            return seasons;
        });

    getJellyfinItem = async (itemId: string) =>
        this.getClient()
            ?.GET('/Users/{userId}/Items/{itemId}', {
                params: {
                    path: {
                        itemId,
                        userId: this.getUserId()
                    }
                }
            })
            .then((r) => r.data);

    getJellyfinPlaybackInfo = async (
        itemId: string,
        playbackProfile: DeviceProfile,
        startTimeTicks = 0,
        maxStreamingBitrate = 140000000
    ) =>
        this.getClient()
            ?.POST('/Items/{itemId}/PlaybackInfo', {
                params: {
                    path: {
                        itemId: itemId
                    },
                    query: {
                        userId: this.getUserId(),
                        startTimeTicks,
                        autoOpenLiveStream: true,
                        maxStreamingBitrate
                    }
                },
                body: {
                    DeviceProfile: playbackProfile
                }
            })
            .then((r) => ({
                playbackUri:
                    r.data?.MediaSources?.[0]?.TranscodingUrl ||
                    `/Videos/${r.data?.MediaSources?.[0]?.Id}/stream.mp4?Static=true&mediaSourceId=${
                        r.data?.MediaSources?.[0]?.Id
                    }&deviceId=${JELLYFIN_DEVICE_ID}&api_key=${this.getApiKey()}&Tag=${
                        r.data?.MediaSources?.[0]?.ETag
                    }`,
                mediaSourceId: r.data?.MediaSources?.[0]?.Id,
                playSessionId: r.data?.PlaySessionId,
                directPlay:
                    !!r.data?.MediaSources?.[0]?.SupportsDirectPlay ||
                    !!r.data?.MediaSources?.[0]?.SupportsDirectStream
            }));

    reportJellyfinPlaybackStarted = (
        itemId: string,
        sessionId: string,
        mediaSourceId: string,
        audioStreamIndex?: number,
        subtitleStreamIndex?: number
    ) =>
        this.getClient()?.POST('/Sessions/Playing', {
            body: {
                CanSeek: true,
                ItemId: itemId,
                PlaySessionId: sessionId,
                MediaSourceId: mediaSourceId,
                AudioStreamIndex: 1,
                SubtitleStreamIndex: -1
            }
        });

    reportJellyfinPlaybackProgress = (
        itemId: string,
        sessionId: string,
        isPaused: boolean,
        positionTicks: number
    ) =>
        this.getClient()?.POST('/Sessions/Playing/Progress', {
            body: {
                ItemId: itemId,
                PlaySessionId: sessionId,
                IsPaused: isPaused,
                PositionTicks: Math.round(positionTicks),
                CanSeek: true,
                MediaSourceId: itemId
            }
        });

    reportJellyfinPlaybackStopped = (
        itemId: string,
        sessionId: string,
        positionTicks: number
    ) =>
        this.getClient()?.POST('/Sessions/Playing/Stopped', {
            body: {
                ItemId: itemId,
                PlaySessionId: sessionId,
                PositionTicks: Math.round(positionTicks),
                MediaSourceId: itemId
            }
        });

    delteActiveEncoding = (playSessionId: string) =>
        this.getClient()?.DELETE('/Videos/ActiveEncodings', {
            params: {
                query: {
                    deviceId: JELLYFIN_DEVICE_ID,
                    playSessionId: playSessionId
                }
            }
        });

    markAsWatched = async (jellyfinId: string) =>
        this.getClient()
            ?.POST('/Users/{userId}/PlayedItems/{itemId}', {
                params: {
                    path: {
                        userId: this.getUserId(),
                        itemId: jellyfinId
                    },
                    query: {
                        datePlayed: new Date().toISOString()
                    }
                }
            })

            .then((res) => res.response.status === 200);

    markAsUnwatched = async (jellyfinId: string) =>
        this.getClient()
            ?.DELETE('/Users/{userId}/PlayedItems/{itemId}', {
                params: {
                    path: {
                        userId: this.getUserId(),
                        itemId: jellyfinId
                    }
                }
            })
            .then((res) => res.response.status === 200);

    getJellyfinHealth = async (
        baseUrl: string | undefined = undefined,
        apiKey: string | undefined = undefined
    ) =>
        axios
            .get((baseUrl || this.getBaseUrl()) + '/System/Info', {
                headers: {
                    'X-Emby-Token': apiKey || this.getApiKey()
                }
            })
            .then((res) => res.status === 200)
            .catch(() => false);

    getJellyfinUsers = async (
        baseUrl: string | undefined = undefined,
        apiKey: string | undefined = undefined
    ): Promise<JellyfinUser[]> =>
        axios
            .get((baseUrl ?? this.getBaseUrl()) + '/Users', {
                headers: {
                    'X-Emby-Token': apiKey ?? this.getApiKey()
                }
            })
            .then((res) => res.data || [])
            .catch(() => []);

    getBackdrop = (item: JellyfinItem, quality = 100) => {
        if (item.BackdropImageTags?.length) {
            return `${this.getBaseUrl()}/Items/${item?.Id}/Images/Backdrop?quality=${quality}&tag=${
                item?.BackdropImageTags?.[0]
            }`;
        } else {
            return `${this.getBaseUrl()}/Items/${
                item?.Id
            }/Images/Primary?quality=${quality}&tag=${item?.ImageTags?.Primary}`;
        }
    };


	getGenres = async (): Promise<{ Id: string; Name: string }[]> => {
    return this.getClient()
        .GET('/Genres', {
            params: {
                query: {
                    userId: this.getUserId(),
                }
            }
        })
        .then((r) => r.data?.Items || []);
};



    private views: Record<string, JellyfinItem | undefined> = {
        movie: undefined,
        series: undefined
    };
}

export const jellyfinApi = new JellyfinApi();
export const jellyfinApiClient = jellyfinApi.getClient;
