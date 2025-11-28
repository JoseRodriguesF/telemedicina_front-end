import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const CLOUD_NAME = process.env.CLOUDNARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDNARY_API_KEY;
const API_SECRET = process.env.CLOUDNARY_API_SECRET;

export async function GET() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ message: 'Cloudinary não configurado no servidor' }, { status: 500 });
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const toSign = `timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  return NextResponse.json({ cloudName: CLOUD_NAME, apiKey: API_KEY, timestamp, signature });
}
