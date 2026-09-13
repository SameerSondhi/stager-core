import { NextRequest, NextResponse } from 'next/server';
import { stagerDb } from '@stager/database';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    let pollResponse: string | undefined = undefined;
    let userId: string | undefined = undefined;

    try {
      const body = await request.json();
      if (body) {
        if (typeof body.poll_response === 'string') {
          pollResponse = body.poll_response.trim();
        }
        if (typeof body.user_id === 'string') {
          userId = body.user_id.trim();
        }
      }
    } catch {
      // Body may be empty if simple acknowledgment click
    }

    const success = await stagerDb.acknowledgeBroadcast(id, userId, pollResponse);
    return NextResponse.json(
      { acknowledged: success, broadcast_id: id, poll_response: pollResponse ?? null },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to acknowledge broadcast';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

