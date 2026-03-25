import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

const API_BASE = import.meta.env.VITE_API_URL || "";

let authToken: string | null = localStorage.getItem("auth_token");

function authHeaders(): HeadersInit {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export function getToken(): string | null {
  return authToken;
}

// --- Auth API ---

export interface AuthUser {
  id: string;
  orgId: string | null;
  ipIdentifier: string | null;
  role: string | null;
}

export async function getRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const res = await fetch(`${API_BASE}/api/auth/register/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Registration failed" }));
    throw new Error(err.error || "Registration failed");
  }
  return res.json();
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  challenge: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/auth/register/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response, challenge }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Verification failed" }));
    throw new Error(err.error || "Verification failed");
  }
  return res.json();
}

export async function getLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const res = await fetch(`${API_BASE}/api/auth/login/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to get login options");
  return res.json();
}

export async function verifyLogin(
  response: AuthenticationResponseJSON,
  challenge: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/auth/login/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response, challenge }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}

export async function getMe(): Promise<{ user: AuthUser | null }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) return { user: null };
  return res.json();
}

// --- Org API ---

export async function createOrg(ipIdentifier: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/auth/org`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ipIdentifier }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create organization" }));
    throw new Error(err.error || "Failed to create organization");
  }
  return res.json();
}

// --- Sign API ---

export interface PrepareResult {
  content_id: string;
  merkle_root: string;
}

export async function prepareSign(file: File, description: string): Promise<PrepareResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("description", description);
  const res = await fetch(`${API_BASE}/api/sign/prepare`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Prepare failed" }));
    throw new Error(err.error || "Prepare failed");
  }
  return res.json();
}

export async function getSignOptions(merkleRoot: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const res = await fetch(`${API_BASE}/api/auth/sign/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ merkleRoot }),
  });
  if (!res.ok) throw new Error("Failed to get sign options");
  return res.json();
}

export async function verifySign(
  response: AuthenticationResponseJSON,
  challenge: string
): Promise<{ verified: boolean; accountId: string; orgId: string; credentialId: string; publicKey: string }> {
  const res = await fetch(`${API_BASE}/api/auth/sign/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ response, challenge }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Sign verification failed" }));
    throw new Error(err.error || "Sign verification failed");
  }
  return res.json();
}

export async function completeSign(
  contentId: string,
  signature: string,
  publicKey: string,
  credentialId: string
): Promise<{ content_id: string; ip_id: string }> {
  const res = await fetch(`${API_BASE}/api/sign/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content_id: contentId, signature, publicKey, credentialId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Complete failed" }));
    throw new Error(err.error || "Complete failed");
  }
  return res.json();
}

// --- Validate API ---

export interface TimelineVideoEntry {
  frame_index: number;
  time: number;
  match: {
    ip_identifier: string;
    content_id: string;
    description: string | null;
    score: number;
    merkle_verified: boolean;
  } | null;
}

export interface TimelineAudioEntry {
  segment: number;
  time_start: number;
  time_end: number;
  match: {
    ip_identifier: string;
    content_id: string;
    description: string | null;
    score: number;
    merkle_verified: boolean;
  } | null;
}

export interface Match {
  ip_identifier: string;
  content_id: string;
  description: string | null;
  timestamp: string;
  signature_valid: boolean;
  merkle_verified: boolean;
  video_frames_matched?: number;
  audio_segments_matched?: number;
  score?: number;
}

export interface ValidateResult {
  valid: boolean;
  duration?: number;
  fps?: number;
  total_frames?: number;
  verified_percent?: number;
  matches: Match[];
  timeline: {
    video: TimelineVideoEntry[];
    audio: TimelineAudioEntry[];
  };
}

export async function validateFile(file: File): Promise<ValidateResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/validate`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Validation failed: ${res.status}`);
  return res.json();
}

export async function validateUrl(url: string): Promise<ValidateResult> {
  const res = await fetch(`${API_BASE}/api/validate/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Validation failed: ${res.status}`);
  return res.json();
}
