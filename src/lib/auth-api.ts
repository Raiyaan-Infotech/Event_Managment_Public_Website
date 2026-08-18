/**
 * Client-side calls made from the auth screens.
 *
 * Separate from `site.ts`, which is server-only (it reads `headers()`). These
 * run in the browser, so the base URL must come from a NEXT_PUBLIC_ variable —
 * and note it is inlined at BUILD time, so a deploy without it set will call
 * localhost (§121b.3 cost a debugging pass exactly this way).
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export interface RegisterPayload {
    name: string;
    email: string;
    dial_code?: string;
    mobile?: string;
    password: string;
}

export interface RegisterResult {
    ok: boolean;
    /** Server-supplied message — safe to show, it is written for end users. */
    message: string;
}

/**
 * Creates a `website_clients` row from the signup form.
 *
 * No session is issued and none is expected: these accounts have no portal to
 * log into yet, so the screen confirms the signup rather than redirecting.
 * `vendor_id` is deliberately NOT sent — the server decides the tenant.
 */
export async function registerWebsiteClient(payload: RegisterPayload): Promise<RegisterResult> {
    try {
        const response = await fetch(`${API_BASE}/public/website-clients/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // The API answers JSON for both success and handled errors; a proxy or
        // a dead backend can still answer HTML, so parsing is guarded.
        let body: any = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok || !body?.success) {
            return {
                ok: false,
                message: body?.message || 'Something went wrong. Please try again.',
            };
        }

        return { ok: true, message: body.message || 'Account created successfully' };
    } catch {
        // Network-level failure — never surface the raw error to a visitor.
        return { ok: false, message: 'Could not reach the server. Please try again.' };
    }
}

export interface LoginPayload {
    email: string;
    password: string;
    /**
     * Optional, and verified server-side when present: it must match the number
     * stored on the account. Left out entirely when the field is blank, which
     * means "not offered" rather than "must be empty".
     */
    dial_code?: string;
    mobile?: string;
}

/**
 * Verifies a website client's credentials.
 *
 * No session comes back and none is stored: these accounts have no portal to
 * land in yet, so a successful call only means "those credentials were right".
 * When a client area exists, this is where the returned token would be kept.
 */
export async function loginWebsiteClient(payload: LoginPayload): Promise<RegisterResult> {
    try {
        const response = await fetch(`${API_BASE}/public/website-clients/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        let body: any = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok || !body?.success) {
            return {
                ok: false,
                message: body?.message || 'Invalid email or password.',
            };
        }

        return { ok: true, message: body.message || 'Login successful' };
    } catch {
        return { ok: false, message: 'Could not reach the server. Please try again.' };
    }
}
