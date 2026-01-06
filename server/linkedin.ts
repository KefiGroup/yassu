import type { Express } from "express";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:5000";
const REDIRECT_URI = `${APP_URL}/api/auth/linkedin/callback`;

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

export async function getLinkedInAuthUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    state,
    scope: "openid profile email",
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: LINKEDIN_CLIENT_ID!,
      client_secret: LINKEDIN_CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }

  return response.json();
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  // Get user info using OpenID Connect userinfo endpoint
  const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    const error = await userInfoResponse.text();
    throw new Error(`LinkedIn profile fetch failed: ${error}`);
  }

  const userInfo = await userInfoResponse.json();

  return {
    id: userInfo.sub, // LinkedIn user ID
    firstName: userInfo.given_name || "",
    lastName: userInfo.family_name || "",
    email: userInfo.email || "",
    profilePicture: userInfo.picture,
  };
}

export async function refreshLinkedInToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: LINKEDIN_CLIENT_ID!,
      client_secret: LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token refresh failed: ${error}`);
  }

  return response.json();
}
