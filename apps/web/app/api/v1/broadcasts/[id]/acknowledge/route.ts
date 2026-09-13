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
    const success = await stagerDb.acknowledgeBroadcast(id);
    return NextResponse.json({ acknowledged: success, broadcast_id: id }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to acknowledge broadcast';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
