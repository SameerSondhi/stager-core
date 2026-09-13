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

export async function GET() {
  return NextResponse.json(
    { connections: stagerDb.getOAuthConnections() },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = body.provider as string;
    const action = body.action as string;

    if (provider !== 'jira' && provider !== 'google_calendar') {
      return NextResponse.json(
        { error: 'provider must be jira or google_calendar' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action !== 'connect' && action !== 'disconnect') {
      return NextResponse.json(
        { error: 'action must be connect or disconnect' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Stubbed OAuth handshake: persist connection state so queue feeds swap.
    const connections = stagerDb.setOAuthConnection(provider, action === 'connect');
    const queue = await stagerDb.getPersonalQueue();

    return NextResponse.json({ connections, queue }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth stub failed';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
