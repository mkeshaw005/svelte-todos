import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	optimizeDeps: {
		exclude: [
			'@tanstack/query-core',
			'@tanstack/svelte-query',
			'@tanstack/db',
			'@tanstack/query-db-collection'
		]
	}
});
