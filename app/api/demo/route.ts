import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { seedDemoTask } from '@/lib/demo/seed';

export async function POST() {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await seedDemoTask(session.user.sub);
    return NextResponse.json({ taskId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
