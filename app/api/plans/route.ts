import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  // Generate a new token
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  
  // Return the new token
  return NextResponse.json({ token });
}
