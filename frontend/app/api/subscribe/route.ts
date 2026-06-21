import { NextResponse } from 'next/server';

// In-memory store (resets on server restart -- use a file/DB for production)
const subscribers = new Set<string>();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 },
      );
    }

    if (subscribers.has(email)) {
      return NextResponse.json(
        { success: false, error: 'Already subscribed' },
        { status: 409 },
      );
    }

    subscribers.add(email);

    // Log subscription (in production, save to DB and send confirmation via email service)
    console.log(`[Newsletter] New subscriber: ${email} (total: ${subscribers.size})`);

    return NextResponse.json(
      { success: true, message: 'Successfully subscribed!' },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
