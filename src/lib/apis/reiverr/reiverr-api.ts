import createClient from 'openapi-fetch';
import type { components, paths } from './reiverr.generated';
import { get } from 'svelte/store';
import type { Api } from '../api.interface';
import { sessions } from '../../stores/session.store';

export type ReiverrUser = components['schemas']['UserDto'];
export type CreateReiverrUser = components['schemas']['CreateUserDto'];
export type UpdateReiverrUser = components['schemas']['UpdateUserDto'];
export type ReiverrSettings = ReiverrUser['settings'];

export type RequestDto = components['schemas']['Request'];
export type CreateRequestDto = components['schemas']['CreateRequestDto'];
export type UpdateRequestDto = components['schemas']['UpdateRequestDto'];

export class ReiverrApi implements Api<paths> {
	getClient(basePath?: string, _token?: string) {
		const session = get(sessions).activeSession;
		const token = _token || session?.token;

		return createClient<paths>({
			baseUrl: (basePath || session?.baseUrl) + '/api',
			...(token && {
				headers: {
					Authorization: 'Bearer ' + token
				}
			})
		});
	}

		getSettings = () =>
			this.getClient()
				?.GET('/settings', {})
				.then((res) => ({ settings: res.data, error: res.error?.message }));
	
		updateSettings = (settings: any) =>
			this.getClient()
				?.PATCH('/settings', {
					body: settings
				})
				.then((res) => ({ settings: res.data, error: res.error?.message }));



	updateUser = (id: string, user: UpdateReiverrUser) =>
		this.getClient()
			?.PUT('/users/{id}', {
				params: {
					path: {
						id
					}
				},
				body: user
			})
			.then((res) => ({ user: res.data, error: res.error?.message }));

	getUsers = () =>
		this.getClient()
			.GET('/users', {})
			.then((res) => res.data);

	deleteUser = (id?: string) =>
		this.getClient()
			?.DELETE('/users/{id}', {
				params: {
					path: {
						id: id || get(sessions).activeSession?.id || ''
					}
				}
			})
			.then((res) => res.error?.message);

	createUser = (user: CreateReiverrUser) =>
		this.getClient()
			?.POST('/users', {
				body: user
			})
			.then((res) => ({ user: res.data, error: res.error?.message }));




	 fetchRequestUser = async (user_id: string) => {
		try {
		  const response = await this.getClient()?.GET(`/users/${user_id}`);
		  if (response?.data) {
			return { user: response.data, error: null };
		  } else {
			throw new Error('No user data found');
		  }
		} catch (error) {
		  console.error('Error fetching user details:', error);
		  return { user: { name: 'Unknown User', profilePicture: '' }, error };
		}
	  };

	createRequest = (request: CreateRequestDto) =>
		this.getClient()
			?.POST('/requests', {
				body: request
			})
			.then((res) => ({ request: res.data, error: res.error?.message }));

	getAllRequests = () =>
		this.getClient()
			.GET('/requests', {})
			.then((res) => res.data);

	getRequestsByUser = (user_id: string) =>
		this.getClient()
			?.GET('/requests/{user_id}', {
				params: {
					path: {
						user_id
					}
				}
			})
			.then((res) => res.data);


	getRequestsByMediaId = (media_id: number, status?: string) =>
		this.getClient()
			?.GET('/requests/media/{media_id}', {
				params: {
					path: {
						media_id
					},
					query: status ? { status } : {}
				}
			})
			.then((res) => res.data as Request[]);



	countRequestsInPeriodForUser = (user_id: string, days: number) =>
		this.getClient()
			?.GET('/requests/count/{user_id}', {
				params: {
					path: {
						user_id
					},
					query: {
						days
					}
				}
			})
			.then((res) => res.data);

	updateRequest = (id: number, request: UpdateRequestDto) =>
		this.getClient()
			?.PATCH('/requests/{id}', {
				params: {
					path: {
						id
					}
				},
				body: request
			})
			.then((res) => ({ request: res.data, error: res.error?.message }));

	
	
	deleteRequest = async (id: number) => {
		
		try {
			console.log(`Attempting to delete request with ID: ${id}`);
			const client = this.getClient();
			if (!client) {
				throw new Error('Failed to initialize API client.');
			}

			const response = await client?.DELETE('/requests/{id}', {
				params: {
					path: {
						id
					}
				}
			});

			console.log('Response from DELETE request:', response);

			if (response?.error) {
				console.error('Error from API:', response.error.message);
				return response.error.message;
			}

			console.log('Request successfully deleted.');
			return response.data || 'Request successfully deleted';

			} catch (error) {
				console.error('Error deleting request:', error);
				return error.message;
		}
};
}

export const reiverrApi = new ReiverrApi();
export const getReiverrApiClient = reiverrApi.getClient;
