import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOUD_NAME = process.env.CLOUDNARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDNARY_API_KEY;
const API_SECRET = process.env.CLOUDNARY_API_SECRET;

// Upload directly to Cloudinary from the server. This endpoint accepts a
// multipart/form-data POST from the client and forwards it to Cloudinary using
// a signed request (so secrets are never exposed to the browser).
export async function POST(req: Request) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ message: 'Cloudinary not configured on server' }, { status: 500 });
  }

  try {
    // Read the raw body so we preserve the multipart/form-data file content
    const buf = await req.arrayBuffer();
    const fileBody = typeof Buffer === 'undefined' ? new Uint8Array(buf) : Buffer.from(buf);

    // Build Cloudinary signed params: minimal required is `timestamp` + signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    // Prepare form data for Cloudinary
    const form = new FormData();
    // `fileBody` can be appended as a Blob
    form.append('file', new Blob([fileBody]));
    form.append('api_key', API_KEY);
    form.append('timestamp', timestamp);
    form.append('signature', signature);

    const cloudUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

    const resp = await fetch(cloudUrl, {
      method: 'POST',
      body: form,
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text().catch(() => ({}));
    }

    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Upload to Cloudinary failed' }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'upload proxy alive' }, { status: 200 });
}
