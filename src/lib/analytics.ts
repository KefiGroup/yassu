declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type EventMap = {
  sign_up: { method: string };
  login: { method: string };
  idea_created: { idea_id: string | number; title: string };
  business_plan_generated: { idea_id?: string };
  pitch_deck_generated: { idea_id?: string | null };
  connection_request_sent: { context: 'new_conversation' | 'existing_conversation' };
  team_invitation_sent: { role: string };
  team_member_joined: { team_id?: string; method: 'request_approved' | 'invitation_accepted' };
  message_sent: { type: 'direct' | 'team' };
  profile_completed: Record<string, never>;
  resource_clicked: { name: string; stage: string };
};

type EventName = keyof EventMap;

export function trackEvent<T extends EventName>(
  eventName: T,
  ...args: EventMap[T] extends Record<string, never> ? [] : [params: EventMap[T]]
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, args[0]);
  }
}
