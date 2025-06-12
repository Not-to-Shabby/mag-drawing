import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Mag-Drawing API is running'
  });

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://drawing-plan.vercel.app' 
    : '*'
  );
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? 'https://drawing-plan.vercel.app' 
        : '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
