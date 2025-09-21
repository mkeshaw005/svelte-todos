import { createCollection } from '@tanstack/db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { queryClient } from '$lib/queryClient';

export interface Todo {
	id: number;
	title: string;
	completed: boolean;
	createdAt: string; // ISO string from server (DB timestamptz)
	updatedAt: string; // ISO string from server (DB trigger maintains this)
	completedAt: string | null; // ISO or null when not completed
}

// Reusable query options for Svelte Query and the DB collection
export const todoQueryOptions = {
	queryKey: ['todos'] as const,
	queryFn: async () => {
		const response = await fetch('/api/todos');
		if (!response.ok) throw new Error('Failed to fetch todos');
		return (await response.json()) as Todo[];
	}
};

export const todoCollection = createCollection(
	queryCollectionOptions<Todo>({
		getKey: (item: Todo) => item.id,
		// Spread the shared query options so the collection and UI use the same config
		...todoQueryOptions,
		queryClient
	})
);
