<script lang="ts">
    import Container from '../../../Container.svelte';
    import Button from '../Button.svelte';
    import { modalStack } from '../Modal/modal.store';
    import Dialog from './Dialog.svelte';

    type ActionFn = (() => Promise<any>) | (() => any);

    export let modalId: symbol;

    export let header: string;
    export let body: string;
    export let automaticSelection: ActionFn;
    export let manualSelection: ActionFn;

    let fetching = false;

    function handleAction(actionFn: ActionFn) {
        const result = actionFn();
        if (result) {
            fetching = true;
            result.then(() => {
                fetching = false;
                modalStack.close(modalId);
            });
        } else {
            modalStack.close(modalId);
        }
    }
</script>

<Dialog>
    <div class="header2 mb-4">
        {header}
    </div>
    <div class="font-medium text-secondary-300 mb-8">
        {body}
    </div>
    <Container class="flex flex-col space-y-4">
        <Button type="primary" disabled={fetching} on:clickOrSelect={() => handleAction(automaticSelection)}>
            Monitor Automatically
        </Button>
        <Button type="primary" disabled={fetching} on:clickOrSelect={() => handleAction(manualSelection)}>
            Select Episodes Manually
        </Button>
    </Container>
</Dialog>
