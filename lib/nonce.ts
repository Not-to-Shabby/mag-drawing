import { headers } from 'next/headers';

export async function getNonce(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-nonce') || null;
  } catch {
    return null;
  }
}
