import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const secret = process.env.APP_PASSWORD;

        if (!secret || typeof password !== 'string' || password !== secret) {
            return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
        }

        const data = new TextEncoder().encode(`jobtracker:${secret}`);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const token = Array.from(new Uint8Array(digest))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const res = NextResponse.json({ ok: true });
        res.cookies.set('jt_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90, // 90 days
            path: '/',
        });
        return res;
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
