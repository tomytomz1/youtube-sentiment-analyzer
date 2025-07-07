import { Redis } from '@upstash/redis';
import type { APIContext } from 'astro';

const redis = Redis.fromEnv();

export async function post({ request }: APIContext) {
  const data = await request.json();
  const id = crypto.randomUUID();
  await redis.set(id, data);
  return new Response(JSON.stringify({ id }), { status: 200 });
}

export async function get({ url }: APIContext) {
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });
  const result = await redis.get(id);
  if (!result) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(result), { status: 200 });
}