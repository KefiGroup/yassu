import { db } from "./db";
import * as schema from "../shared/schema";
import { sql, and, eq, lt } from "drizzle-orm";
import { sendNewMessageEmail, sendApplicationReminderEmail } from "./email";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export async function processUnreadMessageNotifications(): Promise<void> {
  try {
    const tenMinutesAgo = new Date(Date.now() - TEN_MINUTES_MS);
    
    const unreadMessages = await db.select({
      messageId: schema.directMessages.id,
      recipientId: schema.directMessages.recipientId,
      senderId: schema.directMessages.senderId,
      content: schema.directMessages.content,
      createdAt: schema.directMessages.createdAt,
    })
    .from(schema.directMessages)
    .where(
      and(
        eq(schema.directMessages.read, false),
        eq(schema.directMessages.emailNotificationSent, false),
        lt(schema.directMessages.createdAt, tenMinutesAgo)
      )
    )
    .limit(50);

    if (unreadMessages.length === 0) {
      return;
    }

    console.log(`[Background Job] Found ${unreadMessages.length} unread messages older than 10 minutes`);

    for (const msg of unreadMessages) {
      try {
        const [recipient] = await db.select({
          email: schema.users.email,
          fullName: schema.profiles.fullName,
          messageNotificationsEnabled: schema.profiles.messageNotificationsEnabled,
        })
        .from(schema.users)
        .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
        .where(eq(schema.users.id, msg.recipientId));

        const [sender] = await db.select({
          fullName: schema.profiles.fullName,
        })
        .from(schema.users)
        .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
        .where(eq(schema.users.id, msg.senderId));

        if (!recipient || !sender) {
          await db.update(schema.directMessages)
            .set({ emailNotificationSent: true })
            .where(eq(schema.directMessages.id, msg.messageId));
          continue;
        }

        if (recipient.messageNotificationsEnabled !== false) {
          const messagePreview = msg.content.length > 100 
            ? msg.content.substring(0, 100) + '...' 
            : msg.content;

          await sendNewMessageEmail(recipient.email, {
            recipientName: recipient.fullName || 'there',
            senderName: sender.fullName || 'Someone',
            messagePreview,
            senderId: msg.senderId,
          });

          console.log(`[Background Job] Sent message notification to ${recipient.email}`);
        }

        await db.update(schema.directMessages)
          .set({ emailNotificationSent: true })
          .where(eq(schema.directMessages.id, msg.messageId));

      } catch (err) {
        console.error(`[Background Job] Failed to process message ${msg.messageId}:`, err);
        await db.update(schema.directMessages)
          .set({ emailNotificationSent: true })
          .where(eq(schema.directMessages.id, msg.messageId));
      }
    }
  } catch (error) {
    console.error('[Background Job] Error processing unread messages:', error);
  }
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export async function processApplicationReminders(): Promise<void> {
  try {
    const twelveHoursAgo = new Date(Date.now() - TWELVE_HOURS_MS);

    const draftApps = await db.execute(sql`
      SELECT ga.id, ga.user_id, ga.group_id, ga.created_at, u.email, u.full_name, g.name as group_name
      FROM group_applications ga
      JOIN users u ON ga.user_id = u.id
      JOIN groups g ON ga.group_id = g.id
      WHERE ga.status = 'draft'
        AND ga.created_at < ${twelveHoursAgo}
        AND (ga.reminder_sent = false OR ga.reminder_sent IS NULL)
    `);

    const rows = (draftApps as any).rows || draftApps;
    if (!rows || rows.length === 0) return;

    console.log(`[Background Job] Found ${rows.length} draft applications older than 12 hours needing reminders`);

    for (const app of rows) {
      try {
        await sendApplicationReminderEmail(app.email, app.full_name || '', app.group_name);
        await db.execute(sql`UPDATE group_applications SET reminder_sent = true WHERE id = ${app.id}`);
        console.log(`[Background Job] Sent 12-hour reminder to ${app.email} for ${app.group_name}`);
      } catch (err) {
        console.error(`[Background Job] Failed to send reminder to ${app.email}:`, err);
        await db.execute(sql`UPDATE group_applications SET reminder_sent = true WHERE id = ${app.id}`);
      }
    }
  } catch (error) {
    console.error('[Background Job] Error processing application reminders:', error);
  }
}

let jobInterval: NodeJS.Timeout | null = null;
let reminderInterval: NodeJS.Timeout | null = null;

export function startBackgroundJobs(): void {
  console.log('[Background Jobs] Starting message notification job (checking every 1 minute)');
  console.log('[Background Jobs] Starting application reminder job (checking every 15 minutes)');
  
  processUnreadMessageNotifications().catch(console.error);
  processApplicationReminders().catch(console.error);
  
  jobInterval = setInterval(() => {
    processUnreadMessageNotifications().catch(console.error);
  }, CHECK_INTERVAL_MS);

  reminderInterval = setInterval(() => {
    processApplicationReminders().catch(console.error);
  }, REMINDER_CHECK_INTERVAL_MS);
}

export function stopBackgroundJobs(): void {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  console.log('[Background Jobs] Stopped');
}
