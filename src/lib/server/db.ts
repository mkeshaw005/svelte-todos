import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app';

// Singleton pool for server
let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		pool = new Pool({ connectionString: databaseUrl });
	}
	return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
	const p = getPool();
	const res = await p.query(text, params);
	return { rows: res.rows as T[] };
}
