import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authenticated = isAuthenticated(req);
  return NextResponse.json({ success: true, authenticated });
}
