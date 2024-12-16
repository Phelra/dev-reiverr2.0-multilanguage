import { sonarrApi } from '../../apis/sonarr/sonarr-api';
import { createModal, modalStack } from '../Modal/modal.store';
import { writable } from 'svelte/store';
import SpinnerModal from '../SpinnerModal.svelte';
import { handleSeriesDownload } from './AutoDownloadManagerSerie';
import ConfirmDialog from '../Dialog/ConfirmDialog.svelte';

const progressMessage = writable("Processing...");

export async function searchSeriesMedia(
	sonarrItem: any,
	season: number,
	monitored: boolean = false,
	episode?: number,
	showPopup: boolean = true
): Promise<boolean> {
	try {
		if ((episode == null || episode === 0) && !monitored) {
			console.log('1');
			await automaticDownloadSeason(sonarrItem, season, showPopup);
			//await sonarrApi.searchSeason(sonarrItem.id, season);
		} else if ((episode == null || episode === 0) && monitored) {
			console.log('2');
			await sonarrApi.monitorSeries(sonarrItem.id, true, 'none');
			await sonarrApi.monitorSeason(sonarrItem.id, season, true);
			await sonarrApi.searchSeason(sonarrItem.id, season);
		} else if (episode != null && episode !== 0) {
			await sonarrApi.monitorEpisode(episode);
			await sonarrApi.searchEpisode(episode);
		} else {
			console.log('3');
			console.error('Invalid conditions for downloading or monitoring', { monitored, episode });
			return false;
		}
		return true;
	} catch (error) {
		console.error('Error during media search execution:', error);
		return false;
	}
}


async function automaticDownloadSeason(sonarrItem: any, season: number, showPopup: boolean) { 
	modalStack.closeTopmost();
	progressMessage.set("Processing...");
	if (showPopup) {
		createModal(SpinnerModal, {
			title: 'Processing Series Download',
			progressMessage: progressMessage
		});
	}

	try {
		await handleSeriesDownload(
			sonarrItem.id,
			season,
			(message: string) => { 
				console.log("Progress update:", message);
				progressMessage.set(message); 
			},
			(error: string) => {
				console.error("Error during series download:", error);
				createErrorDialog(error, () => automaticDownloadSeason(sonarrItem, season, showPopup));
			}
		);

		progressMessage.set("Process completed");

		if (showPopup) {
			setTimeout(() => modalStack.closeTopmost(), 1000);
		}
	} catch (error: any) {
		console.error("Download failed:", error);
		createErrorDialog(error.message || 'Failed to download the series.', () => automaticDownloadSeason(sonarrItem, season, showPopup));
	}
}

function createErrorDialog(error: string, retryCallback: () => void) {
	const errorMessage = `An error occurred while downloading the season: ${error} Do you want to retry downloading the series?`;
	console.log("Displaying error dialog with message:", errorMessage);
	createModal(ConfirmDialog, {
		header: 'Download Error',
		body: errorMessage,
		confirm: () => {
			modalStack.closeTopmost();
			retryCallback();
		},
		cancel: () => {
			modalStack.closeTopmost();
		}
	});
}
