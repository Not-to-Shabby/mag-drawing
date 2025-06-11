"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new plan token and redirect to it
    const newToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    // Use replace instead of push to avoid back button issues
    router.replace(`/plan/${newToken}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Mag-Drawing</h1>
        <p className="text-gray-600 mb-4">Travel Planning Whiteboard</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Creating your plan...</p>
      </div>
    </div>
  );
}
