// Simple in-memory Todo store for demo purposes only.
// In production, replace with a database.

export type Todo = {
	id: number;
	title: string;
	completed: boolean;
};

let nextId = 4;
let todos: Todo[] = [
	{ id: 1, title: 'Buy groceries', completed: false },
	{ id: 2, title: 'Read a book', completed: true },
	{ id: 3, title: 'Walk the dog', completed: false }
];

export function getAll(): Todo[] {
	return todos;
}

export function getById(id: number): Todo | undefined {
	return todos.find((t) => t.id === id);
}

export function create(partial: Pick<Todo, 'title'> & Partial<Pick<Todo, 'completed'>>): Todo {
	const todo: Todo = {
		id: nextId++,
		title: partial.title,
		completed: partial.completed ?? false
	};
	todos = [todo, ...todos];
	return todo;
}

export function updatePartial(id: number, patch: Partial<Omit<Todo, 'id'>>): Todo | undefined {
	const idx = todos.findIndex((t) => t.id === id);
	if (idx === -1) return undefined;
	const updated = { ...todos[idx], ...patch } as Todo;
	todos = [...todos.slice(0, idx), updated, ...todos.slice(idx + 1)];
	return updated;
}

export function remove(id: number): boolean {
	const len = todos.length;
	todos = todos.filter((t) => t.id !== id);
	return todos.length !== len;
}
