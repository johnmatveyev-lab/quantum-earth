/**
 * Validates that required environment variables are present at startup.
 * Call this in main.tsx before rendering the app.
 */
export function validateEnv(): void {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  ] as const;

  const missing = required.filter(
    (key) => !import.meta.env[key] || import.meta.env[key] === ''
  );

  if (missing.length > 0) {
    const message = `[SKYWATCH] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCreate a .env file with these variables to run the app.`;
    console.error(message);

    // Show a user-friendly error in the DOM
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020810;color:#94a3b8;font-family:monospace;padding:2rem;text-align:center">
          <div>
            <h1 style="color:#ef4444;font-size:14px;letter-spacing:0.2em;margin-bottom:1rem">⚠ CONFIGURATION ERROR</h1>
            <p style="font-size:12px;margin-bottom:1rem">Missing required environment variables:</p>
            <ul style="list-style:none;padding:0;font-size:11px;color:#64748b">
              ${missing.map((k) => `<li style="margin:4px 0">${k}</li>`).join('')}
            </ul>
            <p style="font-size:10px;margin-top:1.5rem;color:#475569">Create a .env file with these variables to run SKYWATCH.</p>
          </div>
        </div>
      `;
    }

    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
