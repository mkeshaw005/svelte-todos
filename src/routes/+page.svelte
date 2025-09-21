<!-- +page.svelte -->

<script lang="ts">
	import { createQuery, createMutation } from '@tanstack/svelte-query';
	import { todoQueryOptions } from '$lib/collections';
	import { queryClient } from '$lib/queryClient';
	import {
		getCoreRowModel,
		getFilteredRowModel,
		getSortedRowModel,
		type ColumnDef,
		createTable
	} from '@tanstack/table-core';
	import { tick, onMount } from 'svelte';
	import HeaderSort from '$lib/components/HeaderSort.svelte';
	import type { Todo } from '$lib/collections';

	// Read todos via TanStack Query (powered by TanStack DB collection config)
	const todosQuery = createQuery<Todo[]>(todoQueryOptions);
	// TanStack Table Core (headless) setup: sorting + filtering for completed and title
	type SortingState = Array<{ id: string; desc: boolean }>;
	type ColumnFiltersState = Array<{ id: string; value: unknown }>;
	let sorting: SortingState = [];
	let columnFilters: ColumnFiltersState = [];

	// Helpers: relative "time ago" + full timestamp for tooltip
	function formatTimestamp(ts: string | null | undefined): string {
		if (!ts) return '—';
		try {
			const date = new Date(ts);
			const now = new Date();
			const diffMs = date.getTime() - now.getTime(); // negative for past
			const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

			const absMs = Math.abs(diffMs);
			const s = Math.round(diffMs / 1000);
			const m = Math.round(diffMs / (1000 * 60));
			const h = Math.round(diffMs / (1000 * 60 * 60));
			const d = Math.round(diffMs / (1000 * 60 * 60 * 24));

			if (absMs < 60_000) return rtf.format(s, 'second');
			if (absMs < 60 * 60_000) return rtf.format(m, 'minute');
			if (absMs < 24 * 60 * 60_000) return rtf.format(h, 'hour');
			if (absMs < 30 * 24 * 60 * 60_000) return rtf.format(d, 'day');

			// Older than ~30 days: short absolute date
			return new Intl.DateTimeFormat(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			}).format(date);
		} catch {
			return '—';
		}
	}

	function fullTimestamp(ts: string | null | undefined): string {
		if (!ts) return '';
		try {
			return new Date(ts).toLocaleString();
		} catch {
			return '';
		}
	}

	const columns: ColumnDef<Todo, any>[] = [
		{
			id: 'completed',
			accessorFn: (row) => row.completed,
			header: 'Done',
			enableSorting: false,
			filterFn: (row, _columnId, filterValue: 'all' | true | false) => {
				if (filterValue === 'all' || filterValue == null) return true;
				return row.original.completed === filterValue;
			}
		},
		{
			id: 'title',
			accessorFn: (row) => row.title,
			header: 'Title',
			enableSorting: true,
			filterFn: (row, _columnId, value: string) => {
				if (!value) return true;
				return row.original.title.toLowerCase().includes(String(value).toLowerCase());
			}
		},
		{
			id: 'createdAt',
			accessorFn: (row) => row.createdAt,
			header: 'Created',
			enableSorting: true
		},
		{
			id: 'completedAt',
			accessorFn: (row) => row.completedAt,
			header: 'Completed',
			enableSorting: true
		},
		{
			id: 'updatedAt',
			accessorFn: (row) => row.updatedAt,
			header: 'Updated',
			enableSorting: true
		},
		{
			id: 'actions',
			accessorFn: (row) => row.id,
			header: 'Actions',
			enableSorting: false
		}
	];

	function applyUpdater<T>(state: T, updater: T | ((old: T) => T)): T {
		return typeof updater === 'function' ? (updater as (old: T) => T)(state) : updater;
	}

	$: table = createTable({
		data: $todosQuery.data ?? [],
		columns,
		state: { sorting, columnFilters },
		onSortingChange: (updater) => {
			sorting = applyUpdater(sorting, updater);
		},
		onColumnFiltersChange: (updater) => {
			columnFilters = applyUpdater(columnFilters, updater);
		},
		onStateChange: () => {},
		renderFallbackValue: null,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	// Filters (bound to UI)
	const SORT_STORAGE_KEY = 'todo_table_sort_v1';
	const FILTERS_STORAGE_KEY = 'todo_table_filters_v1';
	// UI filter states
	let doneFilterRaw: 'all' | 'true' | 'false' = 'all';
	let titleFilter = '';
	$: doneFilter = doneFilterRaw === 'true' ? true : doneFilterRaw === 'false' ? false : 'all';
	$: columnFilters = [
		{ id: 'completed', value: doneFilter as 'all' | true | false },
		{ id: 'title', value: titleFilter }
	];

	// Load persisted sorting and filters
	onMount(() => {
		try {
			const rawSort = localStorage.getItem(SORT_STORAGE_KEY);
			if (rawSort) {
				const parsed = JSON.parse(rawSort);
				if (Array.isArray(parsed)) sorting = parsed;
			}
		} catch {}
		try {
			const rawFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
			if (rawFilters) {
				const parsed = JSON.parse(rawFilters);
				if (parsed && typeof parsed === 'object') {
					if (
						parsed.doneFilterRaw === 'all' ||
						parsed.doneFilterRaw === 'true' ||
						parsed.doneFilterRaw === 'false'
					) {
						doneFilterRaw = parsed.doneFilterRaw;
					}
					if (typeof parsed.titleFilter === 'string') {
						titleFilter = parsed.titleFilter;
					}
				}
			}
		} catch {}
	});

	// Persist sorting and filters when they change
	$: (() => {
		try {
			localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sorting));
		} catch {}
	})();
	$: (() => {
		try {
			localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ doneFilterRaw, titleFilter }));
		} catch {}
	})();

	// Sorting helpers
	function getSortFor(id: string): 'asc' | 'desc' | 'none' {
		const entry = sorting.find((s) => s.id === id);
		return entry ? (entry.desc ? 'desc' : 'asc') : 'none';
	}
	function toggleSort(id: string) {
		const cur = getSortFor(id);
		if (cur === 'none') sorting = [{ id, desc: false }];
		else if (cur === 'asc') sorting = [{ id, desc: true }];
		else sorting = [];
	}

	// Compact header menu state
	let showTitleMenu = false;
	let showSettingsMenu = false;

	// Column visibility state
	const SHOW_COL_STORAGE_KEY = 'todo_table_showCol_v1';
	const defaultShowCol = {
		completed: true,
		title: true,
		createdAt: true,
		completedAt: false,
		updatedAt: true
	} as const;
	type ShowCol = typeof defaultShowCol;
	let showCol: ShowCol = { ...defaultShowCol };

	onMount(() => {
		try {
			const raw = localStorage.getItem(SHOW_COL_STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				// Merge parsed into defaults to tolerate versioning
				showCol = { ...defaultShowCol, ...parsed };
			}
		} catch {}
	});
	$: (() => {
		try {
			localStorage.setItem(SHOW_COL_STORAGE_KEY, JSON.stringify(showCol));
		} catch {}
	})();

	function closeMenus() {
		showTitleMenu = false;
		showSettingsMenu = false;
	}

	// Clear helpers
	function clearFilters() {
		doneFilterRaw = 'all';
		titleFilter = '';
	}
	function clearSorting() {
		sorting = [];
	}
	function clearAll() {
		clearFilters();
		clearSorting();
	}

	// Client-side validation for new todos
	let newTitle = '';
	$: newTitleError = (() => {
		const v = newTitle.trim();
		if (!v) return 'Title is required';
		if (v.length > 100) return 'Title must be at most 100 characters';
		return null;
	})();

	// New todo input UX state: only show errors after blur
	let newTitleFocused = false;
	let newTitleTouched = false;
	$: showNewTitleError = newTitleTouched && !newTitleFocused && Boolean(newTitleError);

	// Track per-item pending state
	let togglingIds = new Set<number>();
	let deletingIds = new Set<number>();
	let editingIds = new Set<number>();

	// Inline edit state
	let editingId: number | null = null;
	let editTitle = '';
	$: editTitleError = (() => {
		if (editingId == null) return null;
		const v = editTitle.trim();
		if (!v) return 'Title is required';
		if (v.length > 100) return 'Title must be at most 100 characters';
		return null;
	})();

	let editInputEl: HTMLInputElement | null = null;

	function startEdit(todo: Todo) {
		editingId = todo.id;
		editTitle = todo.title;
		// Focus the edit input on next microtask when it mounts
		Promise.resolve()
			.then(() => tick())
			.then(() => {
				editInputEl?.focus();
				editInputEl?.select();
			});
	}
	function cancelEdit() {
		editingId = null;
		editTitle = '';
	}

	// Create a new todo (optimistic)
	let tempIdCounter = -1; // Negative IDs to avoid collision with server IDs
	const addTodo = createMutation({
		mutationFn: async (title: string): Promise<Todo> => {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});
			if (!res.ok) throw new Error('Failed to create todo');
			return res.json();
		},
		onMutate: async (title: string) => {
			await queryClient.cancelQueries({ queryKey: ['todos'] });
			const previous = queryClient.getQueryData<Todo[]>(['todos']) ?? [];
			const temp: Todo = {
				id: tempIdCounter--,
				title,
				completed: false,
				// leave timestamps "pending" (empty) until server returns authoritative values
				createdAt: '',
				updatedAt: '',
				completedAt: null
			};
			queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [temp, ...old]);
			return { previous } as { previous: Todo[] };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['todos'], context.previous);
			}
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey: ['todos'] });
		}
	});

	// Toggle completed for a todo (optimistic)
	const toggleTodo = createMutation({
		mutationFn: async (todo: Todo): Promise<Todo> => {
			const res = await fetch(`/api/todos/${todo.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ completed: !todo.completed })
			});
			if (!res.ok) throw new Error('Failed to toggle todo');
			return res.json();
		},
		onMutate: async (todo: Todo) => {
			await queryClient.cancelQueries({ queryKey: ['todos'] });
			const previous = queryClient.getQueryData<Todo[]>(['todos']) ?? [];
			togglingIds.add(todo.id);
			togglingIds = new Set(togglingIds);
			queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
				old.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
			);
			return { previous } as { previous: Todo[] };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['todos'], context.previous);
			}
		},
		onSettled: async (_data, _err, variables) => {
			if (variables && typeof variables === 'object' && 'id' in variables) {
				togglingIds.delete((variables as Todo).id);
				togglingIds = new Set(togglingIds);
			}
			await queryClient.invalidateQueries({ queryKey: ['todos'] });
		}
	});

	// Delete a single todo (optimistic)
	const deleteTodo = createMutation({
		mutationFn: async (id: number): Promise<void> => {
			const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete todo');
		},
		onMutate: async (id: number) => {
			await queryClient.cancelQueries({ queryKey: ['todos'] });
			const previous = queryClient.getQueryData<Todo[]>(['todos']) ?? [];
			deletingIds.add(id);
			deletingIds = new Set(deletingIds);
			queryClient.setQueryData<Todo[]>(['todos'], (old = []) => old.filter((t) => t.id !== id));
			return { previous } as { previous: Todo[] };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['todos'], context.previous);
			}
		},
		onSettled: async (_data, _err, id) => {
			if (typeof id === 'number') deletingIds.delete(id);
			deletingIds = new Set(deletingIds);
			await queryClient.invalidateQueries({ queryKey: ['todos'] });
		}
	});

	// Edit title (optimistic)
	const editTodo = createMutation({
		mutationFn: async ({ id, title }: { id: number; title: string }): Promise<Todo> => {
			const res = await fetch(`/api/todos/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});
			if (!res.ok) throw new Error('Failed to update todo');
			return res.json();
		},
		onMutate: async ({ id, title }: { id: number; title: string }) => {
			await queryClient.cancelQueries({ queryKey: ['todos'] });
			const previous = queryClient.getQueryData<Todo[]>(['todos']) ?? [];
			editingIds.add(id);
			editingIds = new Set(editingIds);
			queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
				old.map((t) => (t.id === id ? { ...t, title } : t))
			);
			return { previous } as { previous: Todo[] };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['todos'], context.previous);
			}
		},
		onSettled: async (_data, _err, variables) => {
			if (variables && typeof variables === 'object' && 'id' in variables) {
				editingIds.delete((variables as { id: number }).id);
				editingIds = new Set(editingIds);
			}
			await queryClient.invalidateQueries({ queryKey: ['todos'] });
			cancelEdit();
		}
	});

	async function handleAdd(e: Event) {
		e.preventDefault();
		const title = newTitle.trim();
		if (newTitleError) return;
		await $addTodo.mutateAsync(title);
		newTitle = '';
		// Reset UX state so the field is considered valid until next interaction
		newTitleTouched = false;
		newTitleFocused = false;
	}

	async function handleEditSave() {
		if (editingId == null || editTitleError) return;
		await $editTodo.mutateAsync({ id: editingId, title: editTitle.trim() });
	}

	async function handleClearCompleted() {
		const items = $todosQuery.data ?? [];
		const completed = items.filter((t) => t.completed).map((t) => t.id);
		if (completed.length === 0) return;
		await Promise.all(completed.map((id) => $deleteTodo.mutateAsync(id)));
		await queryClient.invalidateQueries({ queryKey: ['todos'] });
	}
	function handleWindowClick(e: MouseEvent) {
		// Always close header menus
		closeMenus();
		// If editing, cancel when clicking outside the edit container
		if (editingId != null) {
			const path = e.composedPath() as Array<EventTarget>;
			// If click landed on any element within the edit scope (input or edit action buttons), do nothing
			const insideEdit = path.some(
				(el) => el instanceof HTMLElement && el.hasAttribute && el.hasAttribute('data-edit-scope')
			);
			if (!insideEdit) cancelEdit();
		}
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') closeMenus();
	}}
	on:click={handleWindowClick}
/>

<h1 class="heading">Todo List</h1>
<div class="space-y-4">
	<form on:submit|preventDefault={handleAdd} class="m-0 mb-1">
		<div class="composite-input group" class:composite-input--error={showNewTitleError}>
			<div class="relative flex-1">
				<input
					placeholder="Add a new todo..."
					bind:value={newTitle}
					autocomplete="off"
					aria-invalid={showNewTitleError}
					aria-describedby={showNewTitleError ? 'newTitleErrorTip' : undefined}
					maxlength={100}
					class="input-bare block w-full"
					on:focus={() => {
						newTitleFocused = true;
						newTitleTouched = true;
					}}
					on:input={() => {
						newTitleTouched = true;
					}}
					on:blur={() => {
						newTitleFocused = false;
					}}
				/>
				{#if showNewTitleError}
					<div
						id="newTitleErrorTip"
						role="tooltip"
						class="pointer-events-none invisible absolute -top-9 left-0 z-20 rounded bg-red-600 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
					>
						{newTitleError}
						<span
							class="absolute top-full left-3 -mt-px h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-red-600"
						></span>
					</div>
				{/if}
			</div>
			<button
				type="submit"
				class="btn btn-primary -ml-px rounded-l-none rounded-r-md"
				disabled={Boolean(newTitleError) || $addTodo.isPending}
				aria-label="Add todo"
				title={$addTodo.isPending ? 'Adding…' : 'Add todo'}
			>
				{$addTodo.isPending ? '…' : '+'}
			</button>
		</div>
		{#if $addTodo.error}
			<span class="error-text">{String($addTodo.error)}</span>
		{/if}
	</form>

	{#if $todosQuery.isLoading}
		<p class="text-gray-600">Loading...</p>
	{:else if $todosQuery.error}
		<p class="error-text">Error loading todos: {String($todosQuery.error)}</p>
	{:else}
		<div class="table-card">
			<div class="toolbar">
				<div class="flex-1"></div>
				<div class="relative">
					<button
						class="btn btn-gray btn-xs"
						aria-haspopup="menu"
						aria-expanded={showSettingsMenu}
						on:click|stopPropagation={() => {
							showSettingsMenu = !showSettingsMenu;
							showTitleMenu = false;
						}}
						title="Table settings"
					>
						⚙️
					</button>
					{#if showSettingsMenu}
						<div
							class="menu right-0 w-64"
							role="menu"
							aria-label="Table settings"
							tabindex="0"
							on:click|stopPropagation
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Escape') closeMenus();
							}}
						>
							<div class="px-2 py-1 text-xs font-semibold text-gray-500">Columns</div>
							<div class="space-y-1 px-2 py-1">
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" bind:checked={showCol.completed} />
									<span>Done</span>
								</label>
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" bind:checked={showCol.title} />
									<span>Title</span>
								</label>
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" bind:checked={showCol.createdAt} />
									<span>Created</span>
								</label>
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" bind:checked={showCol.completedAt} />
									<span>Completed</span>
								</label>
								<label class="flex items-center gap-2 text-sm">
									<input type="checkbox" bind:checked={showCol.updatedAt} />
									<span>Updated</span>
								</label>
							</div>
							<div class="px-2 py-2 text-xs font-semibold text-gray-500">Actions</div>
							<div class="flex items-center gap-2 px-2 pb-1">
								<button class="btn btn-gray btn-xs" on:click={clearSorting}>Clear sorting</button>
								<button class="btn btn-gray btn-xs" on:click={clearFilters}>Clear filters</button>
								<button class="btn btn-gray btn-xs" on:click={clearAll}>Clear all</button>
								<button
									class="btn btn-gray btn-xs"
									on:click={() => {
										showCol = { ...defaultShowCol };
									}}>Reset defaults</button
								>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<table class="w-full border-collapse">
				<thead class="bg-gray-50">
					<tr>
						{#if showCol.completed}
							<th
								class="w-10 px-1 py-2 text-left text-sm font-semibold text-gray-700 select-none"
								aria-hidden="true"
							>
								<!-- Done column header intentionally empty (no sorting UI) -->
							</th>
						{/if}
						{#if showCol.title}
							<th
								class="relative px-4 py-2 text-left text-sm font-semibold text-gray-700 select-none"
								aria-sort={getSortFor('title') === 'asc'
									? 'ascending'
									: getSortFor('title') === 'desc'
										? 'descending'
										: 'none'}
							>
								<div class="flex items-center justify-between gap-2">
									<button
										class="btn btn-gray btn-xs"
										aria-haspopup="menu"
										aria-expanded={showTitleMenu}
										on:click|stopPropagation={() => {
											showTitleMenu = !showTitleMenu;
										}}
										title="Filter">⋯</button
									>
									<HeaderSort
										label="Title"
										state={getSortFor('title')}
										on:click={() => toggleSort('title')}
									/>
								</div>
								{#if showTitleMenu}
									<div
										class="menu w-64"
										role="menu"
										aria-label="Title column menu"
										tabindex="0"
										on:click|stopPropagation
										on:keydown|stopPropagation={(e) => {
											if (e.key === 'Escape') closeMenus();
										}}
									>
										<div class="px-2 py-1 text-xs font-semibold text-gray-500">Filter</div>
										<div class="px-2 py-1">
											<input
												class="input-sm w-full"
												placeholder="Filter title..."
												bind:value={titleFilter}
											/>
										</div>
									</div>
								{/if}
							</th>
						{/if}
						{#if showCol.createdAt}
							<th
								class="relative px-4 py-2 text-left text-sm font-semibold text-gray-700 select-none"
								aria-sort={getSortFor('createdAt') === 'asc'
									? 'ascending'
									: getSortFor('createdAt') === 'desc'
										? 'descending'
										: 'none'}
							>
								<div class="flex items-center justify-between gap-2">
									<HeaderSort
										label="Created"
										state={getSortFor('createdAt')}
										on:click={() => toggleSort('createdAt')}
									/>
								</div>
							</th>
						{/if}
						{#if showCol.completedAt}
							<th
								class="relative px-4 py-2 text-left text-sm font-semibold text-gray-700 select-none"
								aria-sort={getSortFor('completedAt') === 'asc'
									? 'ascending'
									: getSortFor('completedAt') === 'desc'
										? 'descending'
										: 'none'}
							>
								<div class="flex items-center justify-between gap-2">
									<HeaderSort
										label="Completed"
										state={getSortFor('completedAt')}
										on:click={() => toggleSort('completedAt')}
									/>
								</div>
							</th>
						{/if}
						{#if showCol.updatedAt}
							<th
								class="relative px-4 py-2 text-left text-sm font-semibold text-gray-700 select-none"
								aria-sort={getSortFor('updatedAt') === 'asc'
									? 'ascending'
									: getSortFor('updatedAt') === 'desc'
										? 'descending'
										: 'none'}
							>
								<div class="flex items-center justify-between gap-2">
									<HeaderSort
										label="Updated"
										state={getSortFor('updatedAt')}
										on:click={() => toggleSort('updatedAt')}
									/>
								</div>
							</th>
						{/if}
						<th
							class="px-2 py-2 text-right text-sm font-semibold text-gray-700"
							aria-label="Actions"
						></th>
					</tr>
				</thead>
				<tbody>
					{#each table.getRowModel().rows as row (row.id)}
						<tr class="border-t border-gray-200">
							{#if showCol.completed}
								<td class="w-10 px-1 py-2 align-middle">
									<input
										type="checkbox"
										checked={row.original.completed}
										on:change={() => $toggleTodo.mutate(row.original)}
										disabled={togglingIds.has(row.original.id)}
										class="checkbox"
									/>
								</td>
							{/if}
							{#if showCol.title}
								<td class="px-4 py-2 align-middle">
									{#if editingId === row.original.id}
										<input
											bind:this={editInputEl}
											data-edit-scope
											bind:value={editTitle}
											maxlength={100}
											aria-invalid={Boolean(editTitleError)}
											class="input-sm title"
											on:keydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													handleEditSave();
												} else if (e.key === 'Escape') {
													e.preventDefault();
													cancelEdit();
												}
											}}
										/>
									{:else}
										<span
											class="title title-editable"
											class:line-through={row.original.completed}
											class:text-gray-500={row.original.completed}
											on:dblclick={() => startEdit(row.original)}
											on:keydown={(e) => {
												if (e.key === 'Enter') startEdit(row.original);
											}}
											role="button"
											tabindex="0"
											title="Double‑click or press Enter to edit"
										>
											{row.original.title}
										</span>
									{/if}
								</td>
							{/if}
							{#if showCol.createdAt}
								<td class="px-4 py-2 align-middle text-gray-700">
									<span title={fullTimestamp(row.original.createdAt)}
										>{formatTimestamp(row.original.createdAt)}</span
									>
								</td>
							{/if}
							{#if showCol.completedAt}
								<td class="px-4 py-2 align-middle text-gray-700">
									<span title={fullTimestamp(row.original.completedAt)}
										>{formatTimestamp(row.original.completedAt)}</span
									>
								</td>
							{/if}
							{#if showCol.updatedAt}
								<td class="px-4 py-2 align-middle text-gray-700">
									<span title={fullTimestamp(row.original.updatedAt)}
										>{formatTimestamp(row.original.updatedAt)}</span
									>
								</td>
							{/if}
							<td class="px-2 py-2 text-right align-middle">
								<div class="actions gap-1">
									{#if editingId === row.original.id}
										<button
											data-edit-scope
											on:click={handleEditSave}
											disabled={Boolean(editTitleError) || editingIds.has(row.original.id)}
											class="btn-icon-success-soft"
											aria-label="Save"
											title="Save"
										>
											<!-- Check mark -->
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												aria-hidden="true"
												class="h-3 w-3"
											>
												<path
													fill-rule="evenodd"
													d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.75 11.836l6.543-6.543a1 1 0 011.414 0z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
										<button
											data-edit-scope
											on:click={cancelEdit}
											disabled={editingIds.has(row.original.id)}
											class="btn-icon-info-soft"
											aria-label="Cancel"
											title="Cancel"
										>
											<!-- Back arrow icon -->
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												aria-hidden="true"
												class="h-3 w-3"
											>
												<path d="M11 5l-5 5 5 5" stroke-linecap="round" stroke-linejoin="round" />
												<path d="M6 10h10" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
										</button>
									{:else}
										<button
											on:click={() => $deleteTodo.mutate(row.original.id)}
											disabled={deletingIds.has(row.original.id)}
											aria-label="Delete"
											class="btn-icon-danger-soft"
											title="Delete"
										>
											{#if deletingIds.has(row.original.id)}
												…
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													aria-hidden="true"
													class="h-3 w-3"
												>
													<path
														fill-rule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="mt-3">
				<button
					on:click={handleClearCompleted}
					disabled={!($todosQuery.data ?? []).some((t) => t.completed) || $deleteTodo.isPending}
					class="btn btn-gray btn-lg"
				>
					Remove completed
				</button>
			</div>
		</div>
	{/if}
</div>
