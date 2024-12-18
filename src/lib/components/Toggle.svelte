<script lang="ts">
    import Container from '../../Container.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher<{
        change: boolean;
    }>();

    export let checked: boolean;
    export let disabled: boolean = false;
    let input: HTMLInputElement;

    const handleChange = (e: Event) => {
        if (disabled) return;
        const target = e.target as HTMLInputElement;
        checked = target.checked;
        dispatch('change', target.checked);
    };
</script>

<Container
    class="relative inline-flex items-center w-min h-min"
    on:enter={(e) => {
        if (!disabled && input) {
            e.detail.options.setFocusedElement = input;
        }
    }}
    on:clickOrSelect={() => {
        if (!disabled && input) {
            input.click();
        }
    }}
>
    <input
        type="checkbox"
        bind:checked
        class="sr-only peer"
        bind:this={input}
        on:input={handleChange}
        disabled={disabled} 
    />
    <div
        class="w-[3.25rem] h-7 rounded-full bg-secondary-700 peer-checked:bg-primary-500 peer-selectable
            after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px]
            {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
    />
</Container>
