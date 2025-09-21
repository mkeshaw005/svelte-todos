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

export async function GET() {
	const { rows } = await query<Row>(
		`SELECT id, title, completed,
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            completed_at AS "completedAt"
       FROM todos
       ORDER BY id DESC`
	);
	return json(rows);
}

export async function POST({ request }: { request: Request }) {
	const body = await request.json().catch(() => null);
	if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
		throw error(400, 'Invalid body: { title: string; completed?: boolean }');
	}
	const title = body.title.trim();
	const completed = Boolean(body.completed);
	const { rows } = await query<Row>(
		`INSERT INTO todos (title, completed)
     VALUES ($1, $2)
     RETURNING id, title, completed,
               created_at AS "createdAt",
               updated_at AS "updatedAt",
               completed_at AS "completedAt"`,
		[title, completed]
	);
	return json(rows[0], { status: 201 });
}
