<script lang="ts">
	import Container from '../../Container.svelte';
	import Tab from '../components/Tab/Tab.svelte';
	import Button from '../components/Button.svelte';
	import { tmdbApi } from '../apis/tmdb/tmdb-api';
	import { ArrowLeft, ArrowRight, CheckCircled, ExternalLink, Upload } from 'radix-icons-svelte';
	import TextField from '../components/TextField.svelte';
	import { jellyfinApi, type JellyfinUser } from '../apis/jellyfin/jellyfin-api';
	import SelectField from '../components/SelectField.svelte';
	import SelectItem from '../components/SelectItem.svelte';
	import { sonarrApi } from '../apis/sonarr/sonarr-api';
	import { radarrApi } from '../apis/radarr/radarr-api';
	import { useTabs } from '../components/Tab/Tab';
	import classNames from 'classnames';
	import { user } from '../stores/user.store';
	import { sessions } from '../stores/session.store';
	import Panel from '../components/Panel.svelte';
	import TmdbIntegrationConnect from '../components/Integrations/TmdbIntegrationConnect.svelte';
	import JellyfinIntegration from '../components/Integrations/JellyfinIntegration.svelte';
	import SonarrIntegration from '../components/Integrations/SonarrIntegration.svelte';
	import RadarrIntegration from '../components/Integrations/RadarrIntegration.svelte';
	import TmdbAdminIntegration from '../components/Integrations/TmdbAdminIntegration.svelte';
	import { generalSettings } from '../stores/generalSettings.store';
	import { getRandomProfilePicture, profilePictures } from '../profile-pictures';
	import ProfileIcon from '../components/ProfileIcon.svelte';

	enum Tabs {
		Welcome,
		ProfilePicture,
		Tmdb,
		Jellyfin,
		Sonarr,
		Radarr,
		Complete,

		SelectUser = Jellyfin + 0.1,
		TmdbConnect = Tmdb + 0.1
	}

	const tab = useTabs(Tabs.Welcome, { ['class']: 'w-max max-w-lg' });
	const adminTmdbConfigured = $generalSettings?.data?.integrations?.tmdb?.sessionId?.length ?? 0 > 0;
	let profilePictureBase64: string = profilePictures.leo;
	let profilePictureTitle: string = 'Leo';
	let profilePictureFilesInput: HTMLInputElement;
	let profilePictureFiles: FileList;

	async function setProfilePicture(image: string, title: string) {
		profilePictureBase64 = image;
		profilePictureTitle = title;

		await user.updateUser((prev) => ({
			...prev,
			profilePicture: image,
		}));
		tab.next();
	}

	async function handleProfilePictureUpload() {
		const file = profilePictureFiles?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
			const image = reader.result as string;
			setProfilePicture(image, 'Custom');
			};
			reader.readAsDataURL(file); 
		}
	}

	$: connectedTmdbAccount = $user?.settings.tmdb.userId && tmdbApi.getAccountDetails();

	let jellyfinUser: JellyfinUser | undefined = undefined;
	let jellyfinUsers: Promise<JellyfinUser[]> = Promise.resolve([]);

	async function finalizeSetup() {
		await user.updateUser((prev) => ({
			...prev,
			onboardingDone: true
		}));
	}

	function handleBack() {
		tab.previous();
	}
</script>

<Container focusOnMount class="h-full w-full flex items-center justify-center" on:back={handleBack}>
	<Panel class="grid max-w-lg" size="dynamic">
		<Tab {...tab} tab={Tabs.Welcome} on:back={({ detail }) => detail.stopPropagation()}>
			<h1 class="header2 mb-2 w-full">Welcome to Reiverr</h1>
			<div class="body mb-8">
				Looks like this is a new account. This setup will get you started with connecting your
				services to get most out of Reiverr.
			</div>
			<Container direction="horizontal" class="flex space-x-4 *:flex-1">
				<Button type="primary-dark" on:clickOrSelect={() => sessions.removeSession()}
					>Log Out</Button
				>
				<Button
					focusOnMount
					type="primary-dark"
					on:clickOrSelect={() => tab.next()}
					iconAbsolute={ArrowRight}
				>
					Next
				</Button>
			</Container>
		</Tab>

		<Tab {...tab} tab={Tabs.ProfilePicture}>
			<h1 class="header2 mb-6">Select Profile Picture</h1>
			<Container direction="grid" gridCols={3} class="grid grid-cols-3 gap-4 w-max">
				<ProfileIcon
				url={profilePictures.ana}
				on:clickOrSelect={() => setProfilePicture(profilePictures.ana, 'Ana')}
				focusOnMount={profilePictureBase64 === profilePictures.ana}
			  />
			  <ProfileIcon
				url={profilePictures.emma}
				on:clickOrSelect={() => setProfilePicture(profilePictures.emma, 'Emma')}
				focusOnMount={profilePictureBase64 === profilePictures.emma}
			  />
			  <ProfileIcon
				url={profilePictures.glen}
				on:clickOrSelect={() => setProfilePicture(profilePictures.glen, 'Glen')}
				focusOnMount={profilePictureBase64 === profilePictures.glen}
			  />
			  <ProfileIcon
				url={profilePictures.henry}
				on:clickOrSelect={() => setProfilePicture(profilePictures.henry, 'Henry')}
				focusOnMount={profilePictureBase64 === profilePictures.henry}
			  />
			  <ProfileIcon
				url={profilePictures.keanu}
				on:clickOrSelect={() => setProfilePicture(profilePictures.keanu, 'Keanu')}
				focusOnMount={profilePictureBase64 === profilePictures.keanu}
			  />
			  <ProfileIcon
				url={profilePictures.leo}
				on:clickOrSelect={() => setProfilePicture(profilePictures.leo, 'Leo')}
				focusOnMount={profilePictureBase64 === profilePictures.leo}
			  />
			  <ProfileIcon
				url={profilePictures.sydney}
				on:clickOrSelect={() => setProfilePicture(profilePictures.sydney, 'Sydney')}
				focusOnMount={profilePictureBase64 === profilePictures.sydney}
			  />
			  <ProfileIcon
				url={profilePictures.zendaya}
				on:clickOrSelect={() => setProfilePicture(profilePictures.zendaya, 'Zendaya')}
				focusOnMount={profilePictureBase64 === profilePictures.zendaya}
			  />
			  <ProfileIcon
				url="profile-pictures/leo.webp"
				on:clickOrSelect={() => profilePictureFilesInput?.click()}
				icon={Upload}
				/>
				<input
				bind:this={profilePictureFilesInput}
				type="file"
				bind:files={profilePictureFiles}
				accept="image/png, image/jpeg"
				class="hidden"
				on:change={handleProfilePictureUpload}
			/>
			</Container>
			<Container direction="horizontal" class="flex space-x-4 *:flex-1 mt-4">
				<Button type="primary-dark" on:clickOrSelect={() => tab.previous()}>Back</Button>
				<Button focusedChild type="primary-dark" on:clickOrSelect={() => tab.next()}>
					Next
				</Button>
			</Container>
		</Tab>
		
		<Tab {...tab} tab={Tabs.Tmdb}>
			<h1 class="header2 mb-2">Connect the TMDb Admin Account</h1>
			<div class="body mb-4">
				This account will be the default account used for all users if they haven't connected their own account.
			</div>
			
			<TmdbAdminIntegration let:connected>
				{#if !connected}
					<div class="flex flex-col space-y-4 mt-4">
						<p class="mb-4 text-yellow-500">
							Connect the admin TMDb account, which will serve as the default account for users who do not connect their own account.
						</p>
						{#if !$generalSettings?.data?.integrations?.tmdb?.userId}
							<Button type="primary-dark" on:clickOrSelect={() => tab.set(Tabs.TmdbConnect)}>
								Connect Admin TMDb account
							</Button>
						{/if}
					</div>
				{/if}		
				<Container direction="horizontal" class="flex space-x-4 *:flex-1 mt-4">
					<Button type="primary-dark" on:clickOrSelect={() => tab.previous()}>Back</Button>
					<Button focusedChild type="primary-dark" on:clickOrSelect={() => tab.next()}>
						{connected ? 'Next' : 'Skip'}
					</Button>
				</Container>
			</TmdbAdminIntegration>
			

			<!--			<div class="space-y-4 flex flex-col">-->
			<!--				{#await connectedTmdbAccount then account}-->
			<!--					{#if account}-->
			<!--						<SelectField-->
			<!--							class="mb-4"-->
			<!--							value={account.username || ''}-->
			<!--							on:clickOrSelect={() => {-->
			<!--								tab.set(Tabs.TmdbConnect);-->
			<!--							}}>Logged in as</SelectField-->
			<!--						>-->
			<!--					{:else}-->
			<!--						<Button-->
			<!--							type="primary-dark"-->
			<!--							on:clickOrSelect={() => {-->
			<!--								tab.set(Tabs.TmdbConnect);-->
			<!--							}}-->
			<!--						>-->
			<!--							Connect-->
			<!--							<ArrowRight size={19} slot="icon-absolute" />-->
			<!--						</Button>-->
			<!--					{/if}-->
			<!--				{/await}-->
			<!--			</div>-->
		</Tab>

		<Tab
			{...tab}
			tab={Tabs.TmdbConnect}
			on:back={({ detail }) => {
				tab.set(Tabs.Tmdb);
				detail.stopPropagation();
			}}
		>
			<TmdbIntegrationConnect on:connected={() => tab.set(Tabs.Jellyfin)} />
		</Tab>

		<Tab {...tab} tab={Tabs.Jellyfin}>
			<h1 class="header2 mb-2">Connect to Jellyfin</h1>
			<div class="mb-8 body">Connect to Jellyfin to watch movies and tv shows.</div>

			<JellyfinIntegration
				bind:jellyfinUser
				bind:jellyfinUsers
				on:click-user={() => tab.set(Tabs.SelectUser)}
				let:handleSave
				let:stale
				let:empty
				let:unchanged
			>
				<Container direction="horizontal" class="grid grid-cols-2 gap-4 mt-4">
					<Button type="primary-dark" on:clickOrSelect={() => tab.previous()}>Back</Button>
					{#if empty || unchanged}
						<Button focusedChild type="primary-dark" on:clickOrSelect={() => tab.next()}>
							{empty ? 'Skip' : 'Next'}
						</Button>
					{:else}
						<Button
							type="primary-dark"
							disabled={!stale}
							action={() => handleSave().then(tab.next)}
						>
							Connect
						</Button>
					{/if}
				</Container>
			</JellyfinIntegration>

			<!--			<div class="space-y-4 mb-4">-->
			<!--				<TextField bind:value={jellyfinBaseUrl} isValid={jellyfinUsers.then((u) => !!u?.length)}>-->
			<!--					Base Url-->
			<!--				</TextField>-->
			<!--				<TextField bind:value={jellyfinApiKey} isValid={jellyfinUsers.then((u) => !!u?.length)}>-->
			<!--					API Key-->
			<!--				</TextField>-->
			<!--			</div>-->

			<!--			{#await jellyfinUsers then users}-->
			<!--				{#if users.length}-->
			<!--					<SelectField-->
			<!--						value={jellyfinUser?.Name || 'Select User'}-->
			<!--						on:clickOrSelect={() => tab.set(Tabs.SelectUser)}-->
			<!--						class="mb-4"-->
			<!--					>-->
			<!--						User-->
			<!--					</SelectField>-->
			<!--				{/if}-->
			<!--			{/await}-->

			<!--			{#if jellyfinError}-->
			<!--				<div class="text-red-500 mb-4">{jellyfinError}</div>-->
			<!--			{/if}-->
		</Tab>
		<Tab
			{...tab}
			tab={Tabs.SelectUser}
			on:back={({ detail }) => {
				tab.set(Tabs.Jellyfin);
				detail.stopPropagation();
			}}
		>
			<h1 class="header1 mb-2 w-96">Select User</h1>
			<div class="flex flex-col space-y-2" />
			{#await jellyfinUsers then users}
				{#each users || [] as user}
					<SelectItem
						selected={user?.Id === jellyfinUser?.Id}
						on:clickOrSelect={() => {
							jellyfinUser = user;
							tab.set(Tabs.Jellyfin);
						}}
					>
						{user.Name}
					</SelectItem>
				{/each}
			{/await}
		</Tab>

		<Tab {...tab} tab={Tabs.Sonarr}>
			<h1 class="header2 mb-2">Connect to Sonarr</h1>
			<div class="mb-8">Connect to Sonarr for requesting and managing tv shows.</div>

			<SonarrIntegration let:stale let:handleSave let:empty let:unchanged>
				<Container direction="horizontal" class="grid grid-cols-2 gap-4 mt-4">
					<Button type="primary-dark" on:clickOrSelect={() => tab.previous()}>Back</Button>
					{#if empty || unchanged}
						<Button focusedChild type="primary-dark" on:clickOrSelect={() => tab.next()}>
							{empty ? 'Skip' : 'Next'}
						</Button>
					{:else}
						<Button
							type="primary-dark"
							disabled={!stale}
							action={() => handleSave().then(tab.next)}
						>
							Connect
						</Button>
					{/if}
				</Container>
			</SonarrIntegration>
		</Tab>

		<Tab {...tab} tab={Tabs.Radarr}>
			<h1 class="header2 mb-2">Connect to Radarr</h1>
			<div class="mb-8">Connect to Radarr for requesting and managing movies.</div>

			<RadarrIntegration let:stale let:handleSave let:empty let:unchanged>
				<Container direction="horizontal" class="grid grid-cols-2 gap-4 mt-4">
					<Button type="primary-dark" on:clickOrSelect={() => tab.previous()}>Back</Button>
					{#if empty || unchanged}
						<Button focusedChild type="primary-dark" on:clickOrSelect={() => tab.next()}>
							{empty ? 'Skip' : 'Next'}
						</Button>
					{:else}
						<Button
							type="primary-dark"
							disabled={!stale}
							action={() => handleSave().then(tab.next)}
						>
							Connect
						</Button>
					{/if}
				</Container>
			</RadarrIntegration>
		</Tab>

		<Tab {...tab} tab={Tabs.Complete} class={classNames('w-full')}>
			<div class="flex items-center justify-center text-secondary-500 mb-4">
				<CheckCircled size={64} />
			</div>
			<h1 class="header2 text-center w-full">All Set!</h1>
			<div class="body mb-8 text-center">Reiverr is now ready to use.</div>

			<Container direction="horizontal" class="inline-flex space-x-4 w-full">
				<Button type="primary-dark" on:clickOrSelect={() => tab.previous()} icon={ArrowLeft}>
					Back
				</Button>
				<div class="flex-1">
					<Button
						focusedChild
						type="primary-dark"
						on:clickOrSelect={finalizeSetup}
						iconAbsolute={ArrowRight}
					>
						Done
					</Button>
				</div>
			</Container>
		</Tab>
	</Panel>
</Container>
