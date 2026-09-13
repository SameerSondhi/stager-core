import { NextRequest, NextResponse } from 'next/server';
import { stagerDb } from '@stager/database';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawKeyword = searchParams.get('keyword');

  if (!rawKeyword) {
    return NextResponse.json(
      { error: 'Keyword query parameter is required', found: false },
      { status: 400, headers: corsHeaders }
    );
  }

  const cleanKeyword = rawKeyword
    .trim()
    .toLowerCase()
    .replace(/^go\//, '')
    .replace(/^\//, '');

  try {
    const link = await stagerDb.resolveGoLink(cleanKeyword);

    if (!link) {
      return NextResponse.json(
        {
          found: false,
          keyword: cleanKeyword,
          error: `No go-link found for 'go/${cleanKeyword}'`,
          suggestUrl: `http://localhost:3000/?create=${encodeURIComponent(cleanKeyword)}`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        found: true,
        keyword: link.keyword,
        target_url: link.target_url,
        click_count: link.click_count,
        description: link.description,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message, found: false },
      { status: 500, headers: corsHeaders }
    );
  }
}
