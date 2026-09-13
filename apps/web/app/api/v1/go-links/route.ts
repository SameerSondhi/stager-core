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
  try {
    const links = await stagerDb.getGoLinks();
    return NextResponse.json({ go_links: links }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch go-links';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, target_url, description } = body;
    const rawDefaultUrl = body.default_url ?? body.defaultUrl;
    const default_url =
      typeof rawDefaultUrl === 'string' && rawDefaultUrl.trim().length > 0
        ? rawDefaultUrl.trim()
        : undefined;

    if (!keyword || !target_url) {
      return NextResponse.json(
        { error: 'keyword and target_url are required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Basic URL validation (allow `{}` parameter placeholders)
    try {
      new URL(target_url.replace(/\{\}/g, 'placeholder'));
      if (default_url) new URL(default_url);
    } catch {
      return NextResponse.json(
        { error: 'target_url must be a valid absolute URL (e.g., https://...)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const created = await stagerDb.createGoLink(
      keyword,
      target_url,
      description,
      default_url
    );
    return NextResponse.json({ go_link: created }, { status: 201, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create go-link';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
