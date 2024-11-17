import { get, writable } from 'svelte/store';
import { user } from '../stores/user.store';

interface MediaCarousel {
    id: string;
    carouselName?: string;
    parentId?: string;
    filterType?: ('recent' | 'highestRated' | 'genre' | 'tag')[];
    genre?: string | string[];
    tag?: string;
    sortBy?: ('recent' | 'highestRated' | 'random')[];
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function isAdmin(): boolean {
    return get(user)?.isAdmin ?? false;
}

// mediaCarouselStore.ts

export function createMediaCarouselStore() {
    const storedCarousels: MediaCarousel[] = JSON.parse(localStorage.getItem('media-carousels') || '[]');
    const store = writable<MediaCarousel[]>(storedCarousels);

    store.subscribe(value => {
        localStorage.setItem('media-carousels', JSON.stringify(value));
    });

    function logPermissionWarning() {
        console.warn("Permission denied: User is not an admin");
    }

    return {
        subscribe: store.subscribe,
        addCarousel: (carousel: Omit<MediaCarousel, 'id'>) => {
            if (isAdmin()) {
                const newCarousel: MediaCarousel = { ...carousel, id: generateUUID() };
                store.update(carousels => [...carousels, newCarousel]);
            } else {
                logPermissionWarning();
            }
        },
        removeCarousel: (id: string) => {
            if (isAdmin()) {
                store.update(carousels => carousels.filter(carousel => carousel.id !== id));
            } else {
                logPermissionWarning();
            }
        },
        updateCarousel: (id: string, updatedCarousel: Partial<MediaCarousel>) => {
            if (isAdmin()) {
                store.update(carousels =>
                    carousels.map(carousel => (carousel.id === id ? { ...carousel, ...updatedCarousel } : carousel))
                );
            } else {
                logPermissionWarning();
            }
        },
        clearCarousels: () => {
            if (isAdmin()) {
                store.set([]);
                localStorage.removeItem('media-carousels');
            } else {
                logPermissionWarning();
            }
        },
        reorderCarousels: (orderedCarousels: MediaCarousel[]) => {
            if (isAdmin()) {
                store.set(orderedCarousels);
            } else {
                logPermissionWarning();
            }
        }
    };
}

export const mediaCarouselStore = createMediaCarouselStore();
