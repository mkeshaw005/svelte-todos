<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/queryClient';
	import '../app.css';
</script>

<QueryClientProvider client={queryClient}>
	<div class="mx-auto max-w-2xl p-6">
		<slot />
	</div>
</QueryClientProvider>
