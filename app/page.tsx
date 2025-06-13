"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new plan token server-side for security
    const generateSecureToken = async () => {
      try {
        const response = await fetch('/api/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generate_token'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          router.replace(`/plan/${data.token}`);
        } else {
          // Fallback to client-side generation only if server fails
          console.warn('Server token generation failed, using fallback');
          const fallbackToken = `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          router.replace(`/plan/${fallbackToken}`);
        }
      } catch (error) {
        console.error('Token generation error:', error);
        // Fallback for network errors
        const fallbackToken = `offline_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        router.replace(`/plan/${fallbackToken}`);
      }
    };

    generateSecureToken();
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
