import { reiverrApi } from '../../apis/reiverr/reiverr-api';


export async function createMovieApprovedRequest(user: any | null, tmdbId: number, mediaType: number) {
    const userId: number = user?.id;
        if (!userId) {
            throw new Error('User ID is missing');
        }


    try {
        const response = await reiverrApi.createRequest({
            user_id: userId,
            media_id: tmdbId,
            media_type: mediaType,
            status: 'Approved'
        });
        if (response.error) {
            throw new Error(response.error);
        }
        console.log('Request created and approved successfully.');        
        return { success: true };
    } catch (error) {
        console.error('Error creating and approving request:', error);
        throw error;
    }
}



export async function createMovieRequest(tmdbId: number, user: any) {
    try {
        const userId: number = user?.id;
        if (!userId) {
            throw new Error('User ID is missing');
        }

        const response = await reiverrApi.createRequest({
            user_id: userId,
            media_id: tmdbId,
            media_type: 0,
        });

        if (response.error) {
            throw new Error(response.error);
        }

        console.log('Request created successfully.');
        return { success: true };
    } catch (error) {
        console.error('Error creating request:', error);
        return { success: false };
    }
}
  


export async function createSerieRequest(tmdbId: number, user: any, season: number, episode?:number) {
    const userId = user?.id;
    if (!userId) {
        throw new Error('User ID is missing');
    }
    const response = await reiverrApi.createRequest({
        user_id: userId,
        media_id: tmdbId,
        media_type: 1,
        season: season || 1,
        episode: episode,
    });
    if (response.error) {
        throw new Error(response.error);
    }
}

export async function createSerieRequestApprouved(tmdbId: number, user: any, season: number, episode?:number) {
    const userId = user?.id;
    if (!userId) {
        throw new Error('User ID is missing');
    }
    const response = await reiverrApi.createRequest({
        user_id: userId,
        media_id: tmdbId,
        media_type: 1,
        season: season || 1,
        episode: episode,
        status: 'Approved'
    });
    if (response.error) {
        throw new Error(response.error);
    }
}

