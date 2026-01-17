interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password: string;
  topic: string;
}

interface CreateMeetingOptions {
  topic: string;
  startTime: Date;
  duration: number;
  timezone?: string;
  agenda?: string;
}

class ZoomService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      throw new Error("Zoom API credentials not configured");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Zoom access token: ${error}`);
    }

    const data: ZoomTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

    return this.accessToken;
  }

  async createMeeting(options: CreateMeetingOptions): Promise<ZoomMeetingResponse> {
    const token = await this.getAccessToken();

    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: options.topic,
        type: 2,
        start_time: options.startTime.toISOString(),
        duration: options.duration,
        timezone: options.timezone || "America/New_York",
        agenda: options.agenda || "",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: "none",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Zoom meeting: ${error}`);
    }

    return response.json();
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      throw new Error(`Failed to delete Zoom meeting: ${error}`);
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET
    );
  }
}

export const zoomService = new ZoomService();
