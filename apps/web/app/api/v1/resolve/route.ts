import { NextRequest, NextResponse } from 'next/server';
import {
  interpolateGoLinkUrl,
  parseGoLinkInput,
  stagerDb,
} from '@stager/database';

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

  const { keyword, parameter } = parseGoLinkInput(rawKeyword);

  if (!keyword) {
    return NextResponse.json(
      { error: 'Keyword query parameter is required', found: false },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const link = await stagerDb.resolveGoLink(keyword);

    if (!link) {
      return NextResponse.json(
        {
          found: false,
          keyword,
          parameter,
          error: `No go-link found for 'go/${keyword}'`,
          suggestUrl: `http://localhost:3000/?create=${encodeURIComponent(keyword)}`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    let targetUrl: string;
    const hasPlaceholder = link.target_url.includes('{}');

    if (hasPlaceholder && !parameter) {
      if (link.default_url && link.default_url.trim().length > 0) {
        targetUrl = link.default_url.trim();
      } else {
        // Strip trailing slash before {} if present, or strip {}
        targetUrl = link.target_url
          .replace(/\/\{\}$|\{\}$/, '')
          .replace(/\{\}/g, '');
      }
    } else {
      targetUrl = interpolateGoLinkUrl(link, parameter);
    }

    // Safety guarantee: Never navigate to a URL containing literal `{}` or `%7B%7D`
    targetUrl = targetUrl
      .replace(/\/\{\}$|\{\}$/, '')
      .replace(/\{\}/g, '')
      .replace(/\/%7B%7D$|%7B%7D$/i, '')
      .replace(/%7B%7D/gi, '');

    return NextResponse.json(
      {
        found: true,
        keyword: link.keyword,
        parameter,
        target_url: targetUrl,
        default_url: link.default_url ?? null,
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
