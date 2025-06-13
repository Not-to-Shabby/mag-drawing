import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Log CSP violations for monitoring
    console.log('CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      report: report['csp-report'] || report,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    // In production, you might want to send this to a monitoring service
    // like Sentry, DataDog, or your own logging system
    
    return new NextResponse('OK', { status: 204 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return new NextResponse('Bad Request', { status: 400 });
  }
}

// Ensure only POST requests are allowed
export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
