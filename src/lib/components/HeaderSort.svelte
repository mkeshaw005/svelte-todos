<script lang="ts">
	export let label: string;
	export let state: 'asc' | 'desc' | 'none' = 'none';
</script>

<button
	type="button"
	class="header-sort"
	on:click
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const click = new MouseEvent('click', { bubbles: true });
			(e.currentTarget as HTMLElement).dispatchEvent(click);
		}
	}}
>
	<span>{label}</span>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 20 20"
		fill="currentColor"
		aria-hidden="true"
		class="ml-1 h-4 w-4 text-gray-700 transition-all duration-150 ease-out"
		class:rotate-180={state === 'desc'}
		class:opacity-30={state === 'none'}
		class:opacity-100={state !== 'none'}
	>
		<path
			fill-rule="evenodd"
			d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
			clip-rule="evenodd"
		/>
	</svg>
</button>
