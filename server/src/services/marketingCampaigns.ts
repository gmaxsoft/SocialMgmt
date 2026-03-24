import { MetaApiError } from "./metaGraph";

const GRAPH_VERSION = process.env.GRAPH_API_VERSION ?? "v20.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function normalizeAdAccountId(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("act_")) return s;
  return `act_${s.replace(/^act_/, "")}`;
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const u = new URL(`${BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: { message: string; code: number } };
  if (data && typeof data === "object" && "error" in data && data.error) {
    const e = data.error;
    throw new MetaApiError(e.message ?? "Marketing API error", e.code, res.status);
  }
  return data;
}

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
};

export async function listCampaigns(adAccountId: string, accessToken: string) {
  const id = normalizeAdAccountId(adAccountId);
  const fields = "id,name,status,effective_status,objective";
  const url = buildUrl(`/${id}/campaigns`, {
    fields,
    limit: 100,
    access_token: accessToken,
  });
  const out = await graphJson<{ data: CampaignRow[] }>(url);
  return out.data ?? [];
}

/** Aktywne w sensie biznesowym — do wyświetlenia; można filtrować po effective_status */
export async function listActiveCampaigns(adAccountId: string, accessToken: string) {
  const all = await listCampaigns(adAccountId, accessToken);
  return all.filter((c) => ["ACTIVE", "PAUSED", "PENDING_REVIEW", "WITH_ISSUES"].includes(c.effective_status));
}

export async function setCampaignStatus(campaignId: string, accessToken: string, status: "ACTIVE" | "PAUSED") {
  const url = buildUrl(`/${campaignId}`, { access_token: accessToken });
  const body = new URLSearchParams({ status });
  return graphJson<{ success?: boolean }>(url, { method: "POST", body });
}
