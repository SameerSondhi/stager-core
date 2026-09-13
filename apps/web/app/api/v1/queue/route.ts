import { NextResponse } from 'next/server';
import { stagerDb } from '@stager/database';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const queue = await stagerDb.getPersonalQueue();
    return NextResponse.json(queue, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch personal queue';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
