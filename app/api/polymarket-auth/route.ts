import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address, signature, timestamp, nonce = 0 } = await request.json();

    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call Polymarket's derive-api-key endpoint
    const response = await fetch(
      'https://clob.polymarket.com/auth/derive-api-key',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_ADDRESS': address,
          'POLY_SIGNATURE': signature,
          'POLY_TIMESTAMP': timestamp.toString(),
          'POLY_NONCE': nonce.toString(),
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Polymarket auth error:', error);
      return NextResponse.json(
        { error: 'Failed to derive API credentials' },
        { status: response.status }
      );
    }

    const credentials = await response.json();
    return NextResponse.json(credentials);
  } catch (error) {
    console.error('Error in polymarket-auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
