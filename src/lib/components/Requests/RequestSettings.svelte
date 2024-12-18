<script lang="ts">
    import Container from '../../../Container.svelte';
    import TextField from '../TextField.svelte';
    import Button from '../Button.svelte';
    import { writable, get } from 'svelte/store';
    import { generalSettings } from '../../stores/generalSettings.store';
    import Toggle from '../../components/Toggle.svelte';
    import SelectField from '../SelectField.svelte';
    import { createModal } from '../Modal/modal.store';
    import SelectItemDialog from '../SelectItemDialog.svelte'; 
  
    let limitMovies = writable(0);
    let limitTV = writable(0);
    let delayInDays = writable(7);
    let isLoading = writable(false);
    let allowRequests = writable(true);
    let setLimit = writable(false);
    let approvalMethod = writable(0);

    const approvalMethods = [
  { id: 0, name: 'Users need admin approval' },
  { id: 1, name: 'Auto-approval user requests' },
  ];
  
    const fetchSettings = () => {
      const settings = get(generalSettings)?.data?.requests;
      if (settings) {
        limitMovies.set(settings.defaultLimitMovies || 0);
        limitTV.set(settings.defaultLimitTV || 0);
        delayInDays.set(settings.delayInDays || 7);
        allowRequests.set(settings.allowRequests ?? true);
        approvalMethod.set(settings.approvalMethod | 0);
        setLimit.set(settings.setLimit | false);
        console.log('Settings loaded:', settings);
      } else {
        console.log('No settings found, using default values.');
      }
  };
  
    function openModal(items, selectedItem, onSelect) {
		createModal(SelectItemDialog, { items, selectedItem, handleSelectItem: onSelect });
	}
  
  async function handleSave() {
  isLoading.set(true);
  try {
    const currentSettings = get(generalSettings)?.data?.requests || {};
    await generalSettings.updateSettings(prev => ({
      ...prev,
      requests: {
        ...currentSettings,
        defaultLimitMovies: Number($limitMovies),
        defaultLimitTV: Number($limitTV),
        delayInDays: Number($delayInDays),
        allowRequests: $allowRequests,
        approvalMethod: Number($approvalMethod),
        setLimit: $setLimit,
      },
    }));
    console.log('Settings successfully saved.');
  } catch (error) {
    console.error('Failed to save request settings:', error);
  } finally {
    isLoading.set(false);
  }
}

  
    fetchSettings();
  </script>

<div class="space-y-4">
  <Container class="bg-primary-800 rounded-xl p-8">
    <div class="space-y-4">
      <div class="flex items-center justify-between text-lg font-medium text-secondary-100 py-2">
        <label class="mr-2">Allow requests</label>
        <Toggle bind:checked={$allowRequests} on:change={handleSave} />
      </div>
    </div>
  </Container>

  {#if $allowRequests}
    <div class="flex space-x-8">
      <Container class="bg-primary-800 rounded-xl p-8 w-1/2">
        <div class="space-y-4">
          <div class="flex items-center justify-between text-lg font-medium text-secondary-100 py-2">
            <label class="mr-2">Approval Method</label>
            <SelectField
              value={approvalMethods.find(method => method.id === $approvalMethod)?.name || 'Select Approval Method'}
              on:clickOrSelect={() =>
                openModal(approvalMethods, $approvalMethod, method => {
                  approvalMethod.set(method.id);
                  handleSave();
                })
              }
              tabindex="0"
            ></SelectField>
          </div>
          <p class="mb-4 text-yellow-500">
            {#if $approvalMethod === 0}
              Note: With this configuration, all user requests will need to be approved by an administrator.
            {:else if $approvalMethod === 1}
              Note: With this configuration, user requests will be automatically approved.
            {/if}
          </p>
        </div>
      </Container>

      {#if $approvalMethod !== 1}
        <Container class="bg-primary-800 rounded-xl p-8 w-1/2">
          <div class="space-y-4 mb-4">
            <div class="flex items-center justify-between text-lg font-medium text-secondary-100 py-2">
              <label>Enable a limit on auto-approved requests</label>
              <Toggle bind:checked={$setLimit} on:change={handleSave} />
            </div>

            <p class="mb-4 text-yellow-500">
              Users can search media automatically up to the set limit. After that, admin approval is required.
            </p>

            {#if $setLimit}
              <Container>
                <div class="space-y-4 mb-4">
                  <div class="flex space-x-4">
                    <div class="w-1/2">
                      <TextField 
                        bind:value={$limitMovies} 
                        isValid={true} 
                        on:change={handleSave}
                        disabled={!$setLimit}
                      >
                        Limit automatic movie approvals
                      </TextField>
                    </div>
                    <div class="w-1/2">
                      <TextField 
                        bind:value={$limitTV} 
                        isValid={true} 
                        on:change={handleSave}
                        disabled={!$setLimit}
                      >
                        Limit automatic season approvals
                      </TextField>
                    </div>
                  </div>
                  <div class="w-full">
                    <TextField 
                      bind:value={$delayInDays} 
                      isValid={true} 
                      on:change={handleSave}
                      disabled={!$setLimit}
                    >
                      Number of days before limits reset
                    </TextField>
                  </div>
                </div>
              </Container>
            {/if}
          </div>
        </Container>
      {/if}
    </div>
  {/if}
</div>
