<script lang="ts">
    import Container from '../../Container.svelte';
    import classNames from 'classnames';
    import Tab from '../components/Tab/Tab.svelte';
    import DetachedPage from '../components/DetachedPage/DetachedPage.svelte';
    import { writable, get } from 'svelte/store';
    import RequestItem from "../components/Requests/RequestItem.svelte"
    import { useTabs } from '../components/Tab/Tab';
    import { generalSettings } from '../stores/generalSettings.store';
    import { user } from '../stores/user.store';
    import { requestsStore } from '../stores/requests.store';

    $: requestsStore.fetchUserRequests();

    enum Tabs {
        AllRequests,
        History
    }

    export let id: string;

    const tab = useTabs(Tabs.AllRequests, { size: 'stretch' });
    let userId = writable('');
    let isAdmin = writable(false);
    let delayInDays = writable(7);
    let defaultLimitMovies = writable(0);

    const loadUser = async () => {
        const currentUser = get(user);
        if (currentUser) {
            isAdmin.set(currentUser.isAdmin);
            userId.set(currentUser.id);
        }

        // Fetch delayInDays and defaultLimitMovies from generalSettings store
        const settings = get(generalSettings)?.data?.requests;
        if (settings) {
            if (settings.delayInDays) {
                delayInDays.set(settings.delayInDays);  // Set delayInDays from the store
                console.log(`Loaded delayInDays from generalSettings: ${settings.delayInDays} days.`);
            }
            if (settings.defaultLimitMovies) {
                defaultLimitMovies.set(settings.defaultLimitMovies);  // Set defaultLimitMovies from the store
                console.log(`Loaded defaultLimitMovies from generalSettings: ${settings.defaultLimitMovies} requests.`);
            }
        }
    };

    loadUser();
</script>

<DetachedPage class="pt-16 h-screen flex flex-col">
    <Container
        direction="horizontal"
        class="flex space-x-8 header3 pb-3 border-b-2 border-secondary-700 mb-8 mx-32"
    >
        <Container
            on:enter={() => tab.set(Tabs.AllRequests)}
            on:clickOrSelect={() => tab.set(Tabs.AllRequests)}
            let:hasFocus
            focusOnClick
        >
            <span
                class={classNames('cursor-pointer', {
                    'text-secondary-400': $tab !== Tabs.AllRequests,
                    'text-primary-500': hasFocus
                })}
            >
                {#if $isAdmin}
                    Active Requests
                {:else}
                    My Requests
                {/if}
            </span>
        </Container>

        <Container
            on:enter={() => tab.set(Tabs.History)}
            on:clickOrSelect={() => tab.set(Tabs.History)}
            let:hasFocus
            focusOnClick
        >
            <span
                class={classNames('cursor-pointer', {
                    'text-secondary-400': $tab !== Tabs.History,
                    'text-primary-500': hasFocus
                })}
            >
                History
            </span>
        </Container>
    </Container>
    
    <Container class="flex-1 grid w-full overflow-y-auto scrollbar-hide relative pb-16 px-32" direction="horizontal">
        <Tab {...tab} tab={Tabs.AllRequests} class="w-full">
            <div>
                {#if $requestsStore.filter(request => request.status === 'Pending').length === 0}
                    <p class="text-secondary-400">No pending requests.</p>
                {:else}
                {#each $requestsStore
                    .filter(request => request.status === 'Pending')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as request (request.id)}
                    <RequestItem {request} />
                  {/each}
                  
                {/if}
            </div>
        </Tab>
        <Tab {...tab} tab={Tabs.History} class="w-full">
            <div>
                {#if $requestsStore.filter(request => request.status === 'Approved' || request.status === 'Declined').length === 0}
                    <p class="text-secondary-400">No approved or declined requests yet.</p>
                {:else}
                {#each $requestsStore
                    .filter(request => request.status === 'Approved' || request.status === 'Declined')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as request (request.id)}
                    <RequestItem {request} />
                  {/each}
                  
                {/if}
            </div>
        </Tab>
    </Container>
    
</DetachedPage>
