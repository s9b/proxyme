import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getTask, getStepsForTask, getPendingApproval } from '@/lib/supabase/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const task = await getTask(id);

    if (!task || task.user_id !== session.user.sub) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const [steps, pendingApproval] = await Promise.all([
      getStepsForTask(id),
      task.status === 'awaiting_approval' ? getPendingApproval(id) : Promise.resolve(null),
    ]);

    return NextResponse.json({ task, steps, pendingApproval });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
