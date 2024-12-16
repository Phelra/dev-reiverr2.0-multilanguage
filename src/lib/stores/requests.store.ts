import { writable, get } from 'svelte/store';
import { reiverrApi, type RequestDto } from '../apis/reiverr/reiverr-api';
import { tmdbApi } from '../apis/tmdb/tmdb-api';
import { user } from './user.store';

const userRequests = writable<RequestDto[]>([]);

const mediaDetails = writable<{ [key: number]: { posterUrl: string, title: string } }>({});
const userDetails = writable<{ [key: number]: { userName: string, profilePicture: string } }>({});

async function fetchMediaDetails(requests: RequestDto[]) {
  const mediaInfo = await Promise.all(requests.map(async (request) => {
    const fetchFunction = request.media_type === 0 ? tmdbApi.getTmdbMovie : tmdbApi.getTmdbSeries;
    const media = await fetchFunction(request.media_id);
    return {
      id: request.id,
      posterUrl: `https://image.tmdb.org/t/p/w200${media.poster_path || ''}`,
      title: media.title || media.name || 'Unknown Media',
    };
  }));

  const mediaMap = mediaInfo.reduce((acc, media) => {
    acc[media.id] = media;
    return acc;
  }, {});
  mediaDetails.set(mediaMap);
}

async function fetchUserDetails(requests: RequestDto[]) {
  const userInfo = await Promise.all(requests.map(async (request) => {
    const fetchedUser = await reiverrApi.fetchRequestUser(request.user_id);
    return {
      id: request.id,
      userName: fetchedUser?.user.name || 'Unknown User',
      profilePicture: fetchedUser?.user.profilePicture || ''
    };
  }));

  const userMap = userInfo.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
  userDetails.set(userMap);
}

async function fetchUserRequests() {
  const currentUser = get(user);
  if (!currentUser) {
    console.log('No user found. Clearing requests.');
    userRequests.set([]);
    mediaDetails.set({});
    userDetails.set({});
    return;
  }

  try {
    console.log(`Fetching requests for user: ${currentUser.id}`);
    const requests = await reiverrApi.getAllRequests();
    if (requests) {
      console.log(`Fetched ${requests.length} requests for user ${currentUser.id}`);
      userRequests.set(requests);

      await Promise.all([
        fetchMediaDetails(requests),
        fetchUserDetails(requests)
      ]);

      console.log('Media and user details successfully updated.');
    } else {
      console.warn(`No requests found for user ${currentUser.id}.`);
    }
  } catch (error) {
    console.error('Error fetching requests or details:', error);
  }
}

async function updateRequestStatus(requestId: number, status: 'Approved' | 'Declined') {
  try {
    console.log(`Updating status for request ${requestId} to ${status}...`);
    const response = await reiverrApi.updateRequest(requestId, { status });
    if (response) {
      userRequests.update(requests =>
        requests.map(req => req.id === requestId ? { ...req, status } : req)
      );
      console.log(`Request ${requestId} status updated to ${status}.`);
    } else {
      console.warn(`Failed to update request ${requestId}.`);
    }
  } catch (error) {
    console.error(`Error updating request ${requestId}:`, error);
  }
}

async function deleteRequest(requestId: number) {
  try {
    console.log(`Deleting request ${requestId}...`);
    const response = await reiverrApi.deleteRequest(requestId);
    if (response) {
      userRequests.update((requests) => requests.filter((req) => req.id !== requestId));
      mediaDetails.update((details) => {
        const newMediaDetails = { ...details };
        delete newMediaDetails[requestId];
        return newMediaDetails;
      });
      userDetails.update((details) => {
        const newUserDetails = { ...details };
        delete newUserDetails[requestId];
        return newUserDetails;
      });
      console.log(`Request ${requestId} successfully deleted.`);
    } else {
      console.warn(`Failed to delete request ${requestId}.`);
    }
  } catch (error) {
    console.error(`Error deleting request ${requestId}:`, error);
  }
}

export const requestsStore = {
  subscribe: userRequests.subscribe,
  mediaDetails,
  userDetails,
  fetchUserRequests,
  updateRequestStatus,
  deleteRequest
};
