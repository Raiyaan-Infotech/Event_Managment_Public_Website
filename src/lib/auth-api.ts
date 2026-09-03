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

export interface LoginResult extends RegisterResult {
    /**
     * The password was correct, but a second factor is still owed. NO session
     * cookie has been set at this point — the backend deliberately withholds
     * one until the code is verified, so `ok: true` here is NOT "signed in".
     */
    requiresTwoFactor?: boolean;
    /** Opaque, short-lived (10 min). Passed straight through to `verifyTwoFactorLogin`. */
    challengeToken?: string;
}

/**
 * Signs a website client in and STORES THE SESSION — unless 2FA is on, in
 * which case it stores NOTHING yet.
 *
 * `credentials: 'include'` is required, not optional: the backend answers with
 * httpOnly Set-Cookie headers, and on a cross-origin fetch the browser
 * silently discards them without it. The request still returns 200, so the
 * omission looks like a working login right up until the portal says "not
 * signed in" — which is exactly how it failed before.
 *
 * The backend also has to answer with `Access-Control-Allow-Credentials: true`
 * and a specific origin (never `*`); this path is carved out of the wildcard
 * public-site CORS for that reason.
 *
 * ── ⚠ A CHALLENGE IS NOT A FAILURE ───────────────────────────────────────────
 * When the account has an authenticator app enrolled, the backend returns
 * `requires_2fa: true` and a `challenge_token` INSTEAD OF a session — the
 * password was right, but that is only step one. The caller must show a
 * code-entry step and call `verifyTwoFactorLogin`; treating this response as
 * "logged in" would let a stolen password bypass the second factor entirely.
 */
export async function loginWebsiteClient(payload: LoginPayload): Promise<LoginResult> {
    try {
        const response = await fetch(`${API_BASE}/public/website-clients/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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

        if (body.data?.requires_2fa) {
            return {
                ok: true,
                message: body.message || 'Enter your two-factor code to finish signing in',
                requiresTwoFactor: true,
                challengeToken: body.data.challenge_token,
            };
        }

        return { ok: true, message: body.message || 'Login successful' };
    } catch {
        return { ok: false, message: 'Could not reach the server. Please try again.' };
    }
}

export interface VerifyTwoFactorPayload {
    challengeToken: string;
    /** A 6-digit authenticator code, OR a backup code — the server accepts either. */
    code: string;
    /** "Trust this device for 30 days" — skips the challenge on this browser's next login. */
    trustDevice?: boolean;
}

/**
 * Step 2 of a 2FA-gated login. Succeeding here is what actually sets the
 * session cookie — `loginWebsiteClient` returning `requiresTwoFactor` does not.
 */
export async function verifyTwoFactorLogin(payload: VerifyTwoFactorPayload): Promise<RegisterResult> {
    try {
        const response = await fetch(`${API_BASE}/public/website-clients/login/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                challenge_token: payload.challengeToken,
                code: payload.code,
                trust_device: payload.trustDevice,
            }),
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
                message: body?.message || 'That code is not right. Check your authenticator app and try again.',
            };
        }

        return { ok: true, message: body.message || 'Login successful' };
    } catch {
        return { ok: false, message: 'Could not reach the server. Please try again.' };
    }
}
