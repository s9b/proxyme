import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { createTask } from '@/lib/supabase/db';
import { runAgent } from '@/lib/agent/executor';

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

    // Run agent in background — don't await, return taskId immediately
    // This lets the frontend start polling while the agent runs
    void runAgent({ taskId: task.id, userId, description: task.description }).catch(() => {
      // Errors are written to Supabase inside runAgent
    });

    return NextResponse.json({ taskId: task.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
