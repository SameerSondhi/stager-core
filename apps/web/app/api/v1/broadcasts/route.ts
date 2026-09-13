import { NextRequest, NextResponse } from 'next/server';
import { stagerDb } from '@stager/database';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const broadcasts = await stagerDb.getBroadcasts(userId, department);
    return NextResponse.json({ broadcasts }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch broadcasts';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      department,
      author_name,
      author_role,
      poll_options,
      expires_in_hours,
      expires_at,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Broadcast title is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Broadcast content is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const broadcast = await stagerDb.createBroadcast({
      title: title.trim(),
      content: content.trim(),
      department: department?.trim() || 'All',
      author_name: author_name?.trim(),
      author_role: author_role?.trim(),
      poll_options: Array.isArray(poll_options)
        ? poll_options.map((o: unknown) => String(o).trim()).filter(Boolean)
        : null,
      expires_in_hours: expires_in_hours ? Number(expires_in_hours) : undefined,
      expires_at,
    });

    return NextResponse.json({ broadcast }, { status: 201, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create broadcast';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

