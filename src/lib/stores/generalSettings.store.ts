import { derived, get, writable } from 'svelte/store';
import axios from 'axios';
import { type Session, sessions } from './session.store';

interface SonarrSettings {
  baseUrl: string;
  apiKey: string;
  qualityProfileId: number;
  rootFolderPath: string;
  languageProfileId: number;
  monitorStrategy: string;
}

interface RadarrSettings {
  baseUrl: string;
  apiKey: string;
  qualityProfileId: number;
  rootFolderPath: string;
  minimumAvailability: string;
}

interface JellyfinSettings {
  baseUrl: string;
  apiKey: string;
}

interface TmdbSettings {
  userId: string;
  sessionId: string;
}

interface Integrations {
  sonarr?: SonarrSettings;
  radarr?: RadarrSettings;
  jellyfin?: JellyfinSettings;
  tmdb?: TmdbSettings;
}

interface RequestSettings {
  allowRequests: boolean;
  approvalMethod: number;
  setLimit: boolean;
  defaultLimitMovies: number;
  defaultLimitTV: number;
  delayInDays: number;
}

interface GeneralSettingsData {
  integrations: Integrations;
  requests: RequestSettings;
}

interface GeneralSettingsStore {
  data: GeneralSettingsData | null;
  loading: boolean;
  error: string | null;
}

function useGeneralSettings() {
  const activeSession = derived(sessions, (sessions) => sessions.activeSession);

  const settingsStore = writable<GeneralSettingsStore>({
    data: null,
    loading: true,
    error: null, 
  });

  let lastActiveSession: Session | undefined;

  activeSession.subscribe(async (activeSession) => {
    if (!activeSession) {
      settingsStore.set({ data: null, loading: false, error: null });
      return;
    }

    settingsStore.set({ data: null, loading: true, error: null });
    lastActiveSession = activeSession;

    try {
      const settings = await axios
        .get<GeneralSettingsData>(`${activeSession.baseUrl}/api/settings`, {
          headers: {
            Authorization: 'Bearer ' + activeSession.token,
          },
        })
        .then((r) => r.data);

      if (lastActiveSession === activeSession) {
        settingsStore.set({ data: settings, loading: false, error: null });
        console.log('Settings successfully loaded:', settings); 
      }
    } catch (error) {
      settingsStore.set({ data: null, loading: false, error: 'Failed to load settings' });
      console.error('Error loading settings:', error);
    }
  });

  async function updateSettings(updateFn: (settings: GeneralSettingsData) => GeneralSettingsData) {
    const { data: settings } = get(settingsStore);

    if (!settings) return;

    const updatedSettings = updateFn(settings);

    try {
      const response = await axios.patch(`${lastActiveSession?.baseUrl}/api/settings`, updatedSettings, {
        headers: {
          Authorization: 'Bearer ' + lastActiveSession?.token,
        },
      });

      if (response.data) {
        settingsStore.set({ data: response.data, loading: false, error: null });
        console.log('Settings successfully updated:', response.data);
      }
    } catch (error) {
      console.error('Error during updateSettings API call:', error);
      settingsStore.update((prev) => ({ ...prev, error: 'Failed to update settings' }));
    }
  }

  return {
    subscribe: settingsStore.subscribe,
    updateSettings,
  };
}

export const generalSettings = useGeneralSettings();