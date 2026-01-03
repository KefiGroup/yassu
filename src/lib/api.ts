const API_BASE = "/api";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    register: (email: string, password: string, fullName: string) =>
      apiRequest<{ user: { id: number; email: string; fullName: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      }),
    login: (email: string, password: string) =>
      apiRequest<{ user: { id: number; email: string; fullName: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" }),
    me: () =>
      apiRequest<{
        user: { id: number; email: string; fullName: string };
        profile: any;
        roles: { role: string }[];
      }>("/auth/me"),
  },

  profile: {
    get: () => apiRequest<any>("/profile"),
    update: (data: any) =>
      apiRequest<any>("/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  profiles: {
    matchSkills: (skills: string[]) =>
      apiRequest<any[]>("/profiles/match-skills", {
        method: "POST",
        body: JSON.stringify({ skills }),
      }),
  },

  advisors: {
    list: () => apiRequest<any[]>("/advisors"),
  },

  ambassadors: {
    list: () => apiRequest<any[]>("/ambassadors"),
  },

  collaborators: {
    list: (params?: {
      roles?: string[];
      skills?: string[];
      interests?: string[];
      clubType?: string;
      search?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      params?.roles?.forEach(r => searchParams.append('roles', r));
      params?.skills?.forEach(s => searchParams.append('skills', s));
      params?.interests?.forEach(i => searchParams.append('interests', i));
      if (params?.clubType) searchParams.append('clubType', params.clubType);
      const queryString = searchParams.toString();
      return apiRequest<any[]>(`/collaborators${queryString ? `?${queryString}` : ''}`);
    },
  },

  universities: {
    list: () => apiRequest<any[]>("/universities"),
    resources: (id: string) => apiRequest<any[]>(`/universities/${id}/resources`),
  },

  ideas: {
    list: () => apiRequest<any[]>("/ideas"),
    get: (id: string) => apiRequest<any>(`/ideas/${id}`),
    create: (data: any) =>
      apiRequest<any>("/ideas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/ideas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/ideas/${id}`, { method: "DELETE" }),
  },

  teams: {
    list: () => apiRequest<any[]>("/teams"),
    create: (data: any) =>
      apiRequest<any>("/teams", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  projects: {
    list: () => apiRequest<any[]>("/projects"),
  },

  workflows: {
    list: () => apiRequest<any[]>("/workflows"),
    get: (id: string) => apiRequest<any>(`/workflows/${id}`),
    run: (data: { workflowType: string; ideaId?: string; inputs?: any }) =>
      apiRequest<any>("/workflows/run", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  notifications: {
    list: () => apiRequest<any[]>("/notifications"),
    markRead: (id: string) =>
      apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
  },
};
