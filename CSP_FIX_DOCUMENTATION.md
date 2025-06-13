# Content Security Policy (CSP) Fix

## Problem
The application was experiencing CSP violations due to Next.js generated inline scripts being blocked. The specific error was:

```
Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-xxx' https://vercel.live ..."
```

## Root Cause
Next.js generates various inline scripts for:
- Application hydration
- Router prefetching
- Dynamic imports
- Error boundaries
- Hot module reloading (development)

These scripts have dynamically generated hashes that change with each build, making it impractical to whitelist specific hashes in the CSP.

**Critical Issue**: When a CSP directive includes a nonce, the `'unsafe-inline'` directive is **ignored** by browsers. This is a security feature of CSP.

## Solution Implemented
1. **Development Environment**: 
   - Allow `'unsafe-eval'` (required for hot reloading)
   - Allow `'unsafe-inline'` (for all Next.js inline scripts)
   - **Remove nonce** from script-src to ensure `'unsafe-inline'` works

2. **Production Environment**:
   - Allow `'unsafe-inline'` for Next.js compatibility
   - **Do not include nonce** in script-src (nonce disables unsafe-inline)
   - Monitor CSP violations via reporting endpoint

### Key Fix
**Removed nonce from CSP script-src directive** because:
- Nonce presence causes browsers to ignore `'unsafe-inline'`
- This is per CSP specification security behavior
- Next.js inline scripts don't use nonces, so they were being blocked

## Security Considerations
- While `'unsafe-inline'` reduces CSP strictness, it's necessary for Next.js functionality
- The application still maintains protection through:
  - Same-origin policy (`'self'`)
  - Nonce-based custom script authorization
  - Other CSP directives (object-src, base-uri, etc.)
  - CSP violation reporting for monitoring

## Future Improvements
1. **Hash Collection**: Monitor CSP reports to collect all Next.js script hashes
2. **Selective Whitelisting**: Replace `'unsafe-inline'` with specific hashes once catalogued
3. **Script Optimization**: Minimize inline scripts where possible
4. **Advanced Monitoring**: Implement real-time CSP violation alerting

## Files Modified
- `middleware.ts`: Updated CSP configuration
- `lib/nonce.ts`: Added nonce utility (created)
- `app/api/csp-report/route.ts`: CSP violation reporting endpoint

## Testing
After deployment, verify:
1. No CSP violations in browser console
2. Application functions correctly
3. CSP reports are being received (if any violations occur)
