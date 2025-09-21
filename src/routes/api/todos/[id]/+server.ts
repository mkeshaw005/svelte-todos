import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';

type Row = {
	id: number;
	title: string;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
};

export async function GET({ params }: { params: { id: string } }) {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'Invalid id');
	const { rows } = await query<Row>(
		`SELECT id, title, completed,
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            completed_at AS "completedAt"
       FROM todos WHERE id = $1`,
		[id]
	);
	if (!rows[0]) throw error(404, 'Not found');
	return json(rows[0]);
}

export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'Invalid id');
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');

	// Support partial updates: title or completed
	const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
	const hasCompleted = Object.prototype.hasOwnProperty.call(body, 'completed');
	if (!hasTitle && !hasCompleted) throw error(400, 'No updatable fields');

	if (hasTitle && typeof body.title !== 'string') throw error(400, 'title must be a string');
	if (hasCompleted && typeof body.completed !== 'boolean')
		throw error(400, 'completed must be a boolean');

	if (hasTitle && hasCompleted) {
		// Update both fields at once; DB trigger will adjust timestamps
		const { rows } = await query<Row>(
			`UPDATE todos SET title = $1, completed = $2 WHERE id = $3
       RETURNING id, title, completed,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 completed_at AS "completedAt"`,
			[body.title.trim(), body.completed, id]
		);
		if (!rows[0]) throw error(404, 'Not found');
		return json(rows[0]);
	} else if (hasTitle) {
		const { rows } = await query<Row>(
			`UPDATE todos SET title = $1 WHERE id = $2
       RETURNING id, title, completed,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 completed_at AS "completedAt"`,
			[body.title.trim(), id]
		);
		if (!rows[0]) throw error(404, 'Not found');
		return json(rows[0]);
	} else {
		const { rows } = await query<Row>(
			`UPDATE todos SET completed = $1 WHERE id = $2
       RETURNING id, title, completed,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt",
                 completed_at AS "completedAt"`,
			[body.completed, id]
		);
		if (!rows[0]) throw error(404, 'Not found');
		return json(rows[0]);
	}
}

export async function DELETE({ params }: { params: { id: string } }) {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'Invalid id');
	const { rows } = await query<{ id: number }>(`DELETE FROM todos WHERE id = $1 RETURNING id`, [
		id
	]);
	if (!rows[0]) throw error(404, 'Not found');
	return new Response(null, { status: 204 });
}
