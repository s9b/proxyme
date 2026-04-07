import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { auth0 } from '@/lib/auth0';
import { createTask } from '@/lib/supabase/db';
import { runAgent } from '@/lib/agent/executor';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { description?: string };
    const { description } = body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    const userId = session.user.sub;
    const task = await createTask(userId, description.trim());

    // Run agent in background — return taskId immediately so frontend can start polling,
    // but use waitUntil so Vercel keeps the Lambda alive until the agent finishes.
    waitUntil(runAgent({ taskId: task.id, userId, description: task.description }).catch(() => {}));

    return NextResponse.json({ taskId: task.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
