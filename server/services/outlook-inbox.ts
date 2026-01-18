import { Client } from '@microsoft/microsoft-graph-client';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

async function getOutlookClient() {
  const accessToken = await getAccessToken();
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export async function syncOutlookEmails() {
  try {
    const client = await getOutlookClient();
    
    // Get the connected account info
    const me = await client.api('/me').select('mail,displayName,userPrincipalName').get();
    const connectedEmail = me.mail || me.userPrincipalName || 'unknown';
    console.log(`[Outlook Sync] Connected as: ${connectedEmail} (${me.displayName})`);
    
    // Fetch recent emails from inbox
    const messages = await client
      .api('/me/mailFolders/inbox/messages')
      .top(50)
      .select('id,subject,from,receivedDateTime,body,isRead,conversationId')
      .orderby('receivedDateTime desc')
      .get();

    const syncedCount = { new: 0, updated: 0 };

    for (const msg of messages.value || []) {
      const senderEmail = msg.from?.emailAddress?.address || 'unknown@email.com';
      const senderName = msg.from?.emailAddress?.name || null;
      const subject = msg.subject || '(No Subject)';
      const content = msg.body?.content || '';
      const receivedAt = new Date(msg.receivedDateTime);
      const outlookMessageId = msg.id;
      const outlookConversationId = msg.conversationId;

      // Check if this message already exists
      const existingMessages = await db.select()
        .from(schema.inboxMessages)
        .where(eq(schema.inboxMessages.outlookMessageId, outlookMessageId));

      if (existingMessages.length > 0) {
        continue; // Already synced
      }

      // Find or create conversation based on sender email
      let conversation = await db.select()
        .from(schema.inboxConversations)
        .where(
          and(
            eq(schema.inboxConversations.userEmail, senderEmail),
            eq(schema.inboxConversations.outlookConversationId, outlookConversationId || '')
          )
        )
        .then(rows => rows[0]);

      if (!conversation) {
        // Create new conversation
        const [newConv] = await db.insert(schema.inboxConversations)
          .values({
            userId: null,
            userEmail: senderEmail,
            userName: senderName,
            subject: subject.slice(0, 200),
            conversationType: 'support',
            outlookConversationId: outlookConversationId || null,
          })
          .returning();
        conversation = newConv;
        syncedCount.new++;
      }

      // Add message to conversation
      await db.insert(schema.inboxMessages)
        .values({
          conversationId: conversation.id,
          senderType: 'user',
          senderId: null,
          content: stripHtml(content),
          isRead: msg.isRead || false,
          outlookMessageId,
          createdAt: receivedAt,
        });

      // Update conversation last message time
      await db.update(schema.inboxConversations)
        .set({ 
          lastMessageAt: receivedAt,
          isResolved: false 
        })
        .where(eq(schema.inboxConversations.id, conversation.id));

      syncedCount.updated++;
    }

    return { success: true, connectedEmail, ...syncedCount };
  } catch (error) {
    console.error('Outlook sync error:', error);
    throw error;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000);
}

export async function sendOutlookReply(toEmail: string, subject: string, content: string) {
  try {
    const client = await getOutlookClient();
    
    await client
      .api('/me/sendMail')
      .post({
        message: {
          subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
          body: {
            contentType: 'HTML',
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <p>${content.replace(/\n/g, '<br>')}</p>
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                  This message was sent from Yassu. You can reply to this email or submit new feedback through the platform.
                </p>
              </div>
            `
          },
          toRecipients: [
            {
              emailAddress: {
                address: toEmail
              }
            }
          ]
        }
      });

    return { success: true };
  } catch (error) {
    console.error('Outlook send error:', error);
    throw error;
  }
}
