import { GoLink } from './types';

export interface ParsedGoLinkInput {
  keyword: string;
  parameter: string | null;
}

/** Split `jira ENG-204`, `jira/ENG-204`, or `go/jira/ENG-204` into base keyword + arg. */
export function parseGoLinkInput(raw: string): ParsedGoLinkInput {
  const cleaned = raw
    .trim()
    .replace(/^go\//i, '')
    .replace(/^go\s+/i, '')
    .replace(/^\//, '');

  if (!cleaned) {
    return { keyword: '', parameter: null };
  }

  const match = cleaned.match(/^([^\s/]+)(?:[\s/]+(.+))?$/);
  const keyword = (match?.[1] || cleaned).toLowerCase();
  const parameter = match?.[2]?.trim() ? match[2].trim() : null;
  return { keyword, parameter };
}

export function interpolateGoLinkUrl(
  link: Pick<GoLink, 'target_url' | 'default_url'>,
  parameter: string | null
): string {
  const hasPlaceholder = link.target_url.includes('{}');

  let resolved: string;
  if (parameter && hasPlaceholder) {
    resolved = link.target_url.replace(/\{\}/g, encodeURIComponent(parameter));
  } else if (!parameter && hasPlaceholder) {
    if (link.default_url && link.default_url.trim().length > 0) {
      resolved = link.default_url.trim();
    } else {
      resolved = link.target_url.replace(/\/\{\}$|\{\}$/, '').replace(/\{\}/g, '');
    }
  } else if (!parameter) {
    if (link.default_url && link.default_url.trim().length > 0) {
      resolved = link.default_url.trim();
    } else {
      resolved = link.target_url;
    }
  } else {
    resolved = link.target_url;
  }

  // Safety guarantee: Never return a URL containing literal `{}` or `%7B%7D`
  return resolved
    .replace(/\/\{\}$|\{\}$/, '')
    .replace(/\{\}/g, '')
    .replace(/\/%7B%7D$|%7B%7D$/i, '')
    .replace(/%7B%7D/gi, '');
}


export function goLinkParamPlaceholder(keyword: string): string {
  switch (keyword.toLowerCase()) {
    case 'jira':
      return '<issue-key>';
    case 'pr':
      return '<pull-id>';
    default:
      return '<param>';
  }
}

export function isParameterizedGoLink(
  link: Pick<GoLink, 'target_url'>
): boolean {
  return link.target_url.includes('{}');
}
