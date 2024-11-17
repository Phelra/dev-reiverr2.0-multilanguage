<script lang="ts">
	import Container from '../../Container.svelte';
	import type { Readable } from 'svelte/store';
	import classNames from 'classnames';
	import { fade } from 'svelte/transition';
	import AnimatedSelection from './AnimateScale.svelte';
	import { type ComponentType, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ clickOrSelect: null }>();

	export let disabled: boolean = false;
	export let focusOnMount: boolean = false;
	export let focusedChild = false;
	export let type: 'primary' | 'secondary' | 'primary-dark' = 'primary';
	export let confirmDanger = false;
	export let action: (() => Promise<any>) | null = null;
	export let icon: ComponentType | undefined = undefined;
	export let iconAfter: ComponentType | undefined = undefined;
	export let iconAbsolute: ComponentType | undefined = undefined;

	let actionIsFetching = false;
	$: _disabled = disabled || actionIsFetching;
	let armed = false;
	let hasFocus: Readable<boolean>;
	$: if (!$hasFocus && armed) armed = false;

	function handleClickOrSelect() {
		if (actionIsFetching || _disabled) return;

		if (confirmDanger && !armed) {
			armed = true;
			return;
		}

		if (action) {
			actionIsFetching = true;
			action().then(() => (actionIsFetching = false));
		}

		dispatch('clickOrSelect');
		armed = false;
	}
</script>

<AnimatedSelection hasFocus={$hasFocus}>
	<Container
		bind:hasFocus
		class={classNames(
			'w-60 h-96 rounded-xl overflow-hidden shadow-lg placeholder shrink-0 flex items-center justify-center group transition duration-200',
			{
				'border-2 border-transparent': true, // Bordure transparente par défaut
				'hover:border-primary-500': !_disabled, // Bordure visible seulement au survol
				'cursor-pointer': !_disabled,
				'cursor-not-allowed opacity-40 pointer-events-none': _disabled
			},
			$$restProps.class
		)}
		style={`animation-delay: ${(0 * 100) % 2000}ms;`}
		on:click
		on:select
		on:clickOrSelect={handleClickOrSelect}
		on:enter
		{focusOnMount}
		{focusedChild}
		tabindex="0"
	>
		<!-- Appliquez la transition fade à cet élément div interne -->
		<div class="text-center font-medium text-secondary-100 text-sm" transition:fade>
			Show More
		</div>
	</Container>
</AnimatedSelection>
