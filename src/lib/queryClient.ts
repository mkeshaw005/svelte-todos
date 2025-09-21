import { QueryClient } from '@tanstack/svelte-query';

// Export a single shared QueryClient instance for the whole app
export const queryClient = new QueryClient();
