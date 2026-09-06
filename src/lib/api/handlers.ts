import { RETENTION_DAYS } from "@/lib/tiers";
import type { ApiCaller } from "./auth";
import { parseLeadQuery } from "./leadsQuery";
import { getApiLead, listApiLeads } from "./leadsRead";
import { requestsToday } from "./limit";
import { ApiError } from "./responses";
import {
  getApiProject,
  listApiPainThemes,
  listApiProjects,
  listApiSeoOpportunities,
  projectUsageToday,
  requireProject,
} from "./resources";

/**
 * One function per endpoint, returning plain JSON. The REST routes and the MCP
 * tools both call these, so an agent and a script see the same answer.
 */

function feedWindowDays(caller: ApiCaller): number {
  return caller.limits?.feedWindowDays ?? RETENTION_DAYS;
}

export async function me(caller: ApiCaller) {
  return {
    user: {
      id: caller.user.id,
      email: caller.user.email,
      createdAt: caller.user.createdAt.toISOString(),
    },
    tier: caller.tier,
    selfHosted: caller.selfHosted,
    limits: caller.limits,
    key: { prefix: caller.keyPrefix, scopes: caller.scopes },
    requestsToday: await requestsToday(caller.keyId),
    requestsPerDay: caller.limits?.apiRequestsPerDay ?? null,
  };
}

export async function projects(caller: ApiCaller) {
  return { projects: await listApiProjects(caller.user.id) };
}

export async function project(caller: ApiCaller, projectId: string) {
  const row = await requireProject(caller.user.id, projectId);
  return { project: await getApiProject(row) };
}

export async function projectLeads(
  caller: ApiCaller,
  projectId: string,
  params: URLSearchParams,
) {
  const row = await requireProject(caller.user.id, projectId);
  return listApiLeads(row.id, parseLeadQuery(params), feedWindowDays(caller));
}

export async function lead(caller: ApiCaller, leadId: string) {
  const found = await getApiLead(caller.user.id, leadId);
  if (!found) {
    throw new ApiError("not_found", "No lead with that id.");
  }
  return { lead: found };
}

export async function projectSeoOpportunities(caller: ApiCaller, projectId: string) {
  const row = await requireProject(caller.user.id, projectId);
  return { opportunities: await listApiSeoOpportunities(row.id) };
}

export async function projectPainThemes(caller: ApiCaller, projectId: string) {
  const row = await requireProject(caller.user.id, projectId);
  return { themes: await listApiPainThemes(row.id) };
}

export async function projectUsage(caller: ApiCaller, projectId: string) {
  const row = await requireProject(caller.user.id, projectId);
  return { usage: await projectUsageToday(row.id) };
}
