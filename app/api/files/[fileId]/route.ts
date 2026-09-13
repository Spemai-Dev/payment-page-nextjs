import { NextRequest, NextResponse } from 'next/server';
import { getOnePayFilesApiKey, getOnePayFilesBaseUrl } from '@/lib/env';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  const apiKey = getOnePayFilesApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { message: 'File preview is not configured (missing ONEPAY_FILES_API_KEY).' },
      { status: 500 },
    );
  }

  const { fileId } = await ctx.params;
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ message: 'Invalid file id.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getOnePayFilesBaseUrl()}/api/files/${fileId}/`, {
      headers: { 'X-API-Key': apiKey },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { message: `File fetch failed (${upstream.status}).` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ message: 'File fetch failed.' }, { status: 500 });
  }
}
