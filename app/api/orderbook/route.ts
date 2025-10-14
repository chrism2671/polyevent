import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('token_id');

  if (!tokenId) {
    return NextResponse.json({ error: 'token_id is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://clob.polymarket.com/book?token_id=${tokenId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orderbook' },
      { status: 500 }
    );
  }
}
