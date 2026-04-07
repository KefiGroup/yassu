import { Resend } from 'resend';
import { db } from './db';
import { sql } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@yassu.ai';
const APP_URL = process.env.APP_URL || 'https://yassu.ai';

const BRANDED_SLUGS = new Set<string>();

export function getBrandedUrl(path: string, groupSlug?: string): string {
  if (groupSlug && BRANDED_SLUGS.has(groupSlug.toLowerCase())) {
    return `${APP_URL}/${groupSlug}${path}`;
  }
  return `${APP_URL}${path}`;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  emailType?: string;
}

async function logEmail(recipient: string, subject: string, emailType: string, status: string, errorMessage?: string, htmlBody?: string) {
  try {
    await db.execute(sql`
      INSERT INTO email_logs (recipient, subject, email_type, status, error_message, html_body)
      VALUES (${recipient}, ${subject}, ${emailType}, ${status}, ${errorMessage || null}, ${htmlBody || null})
    `);
  } catch (err) {
    console.error('[email-log] Failed to log email:', err);
  }
}

export async function sendEmail({ to, subject, html, emailType }: SendEmailOptions): Promise<void> {
  const type = emailType || inferEmailType(subject);
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
    await logEmail(to, subject, type, 'sent', undefined, html);
  } catch (error) {
    console.error('Failed to send email:', error);
    await logEmail(to, subject, type, 'failed', error instanceof Error ? error.message : String(error), html);
    throw new Error('Failed to send email');
  }
}

function inferEmailType(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('password') && s.includes('reset')) return 'password_reset';
  if (s.includes('welcome')) return 'welcome';
  if (s.includes('account') && s.includes('created')) return 'account_created';
  if (s.includes('team') && s.includes('invitation')) return 'team_invitation';
  if (s.includes('message')) return 'new_message';
  if (s.includes('connection')) return 'connection_request';
  if (s.includes('join request') || s.includes('join your')) return 'join_request';
  if (s.includes('accepted')) return 'request_accepted';
  if (s.includes('rejected') || s.includes('declined')) return 'request_rejected';
  if (s.includes('weekly') || s.includes('digest')) return 'weekly_digest';
  if (s.includes('announcement')) return 'announcement';
  if (s.includes('idea') && s.includes('posted')) return 'idea_created';
  if (s.includes('advisor')) return 'advisor_request';
  if (s.includes('investor')) return 'investor_notification';
  if (s.includes('invite') || s.includes('invited')) return 'group_invite';
  if (s.includes('skill') && s.includes('match')) return 'skill_match';
  if (s.includes('feedback') || s.includes('inbox')) return 'admin_inbox';
  return 'other';
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 20px; color: #7c3aed; font-size: 14px; word-break: break-all;">
                ${resetLink}
              </p>
              
              <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  <strong>This link will expire in 1 hour.</strong>
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - Yassu',
    html,
  });
}

export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Yassu!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${fullName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Welcome to Yassu! We're thrilled to have you join our community of elite university talent.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Yassu is where your ideas find the right team to become reality. Whether you're here to launch your own project or join a groundbreaking startup, you're in the right place.
              </p>
              
              <h3 style="margin: 30px 0 15px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Next Steps:</h3>
              
              <ol style="margin: 0 0 20px; padding-left: 20px; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                <li><strong>Complete your profile:</strong> Add your skills and interests so our matching engine can find the right opportunities for you.</li>
                <li><strong>Explore Ideas:</strong> Browse the marketplace to see what others are building.</li>
                <li><strong>Post an Idea:</strong> Have a vision? Share it and start building your dream team.</li>
              </ol>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal/profile" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Complete Your Profile
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Yassu! 🎉',
    html,
  });
}

export async function sendAccountCreatedEmail(email: string, fullName: string, temporaryPassword: string, groupSlug?: string): Promise<void> {
  const loginUrl = getBrandedUrl('/auth', groupSlug);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Yassu Account Has Been Created</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${fullName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                An account has been created for you on <strong>Yassu</strong> — the platform where university founders connect, build teams, and launch startups.${groupSlug ? ' Log in to review and submit your application.' : ''}
              </p>
              
              <div style="background-color: #f3f0ff; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <p style="margin: 0 0 12px; color: #4a4a4a; font-size: 14px; font-weight: 600;">Your Login Credentials:</p>
                <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0; color: #1a1a1a; font-size: 16px;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              </div>
              
              <p style="margin: 0 0 20px; color: #e53e3e; font-size: 14px; font-weight: 600;">
                ⚠️ Please change your password after your first login for security.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Log In to Yassu
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Yassu Account Has Been Created 🎓',
    html,
  });
}

export async function sendTeamInvitationEmail(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  ideaTitle: string,
  ideaId: string,
  personalMessage?: string
): Promise<void> {
  // Link to Teams page where they can see and accept/decline invites
  const teamsLink = `${APP_URL}/portal/teams?tab=my-teams`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${inviteeName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                ${inviterName} has invited you to join the team for <strong>${ideaTitle}</strong> on Yassu!
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                ${inviterName} saw your profile and thinks your skills would be a perfect fit for their vision. This is a great opportunity to collaborate with fellow elite talent on a high-potential project.
              </p>
              
              ${personalMessage ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #7c3aed; border-radius: 4px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; font-style: italic; line-height: 1.6;">
                  "${personalMessage}"
                </p>
              </div>
              ` : ''}
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${teamsLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: inviteeEmail,
    subject: `You've been invited to join ${ideaTitle} on Yassu!`,
    html,
  });
}

export async function sendInviteAcceptedEmail(
  inviterEmail: string,
  inviterName: string,
  inviteeName: string,
  ideaTitle: string
): Promise<void> {
  const dashboardLink = `${APP_URL}/portal/teams`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Accepted - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Great news, ${inviterName}!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${inviteeName}</strong> has accepted your invitation to join the team for <strong>${ideaTitle}</strong>!
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You now have a new team member ready to collaborate. Head over to your team dashboard to connect and start building together.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${dashboardLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Your Team
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: inviterEmail,
    subject: `${inviteeName} accepted your invitation to join ${ideaTitle}!`,
    html,
  });
}

export async function sendNewMessageEmail(
  recipientEmail: string,
  data: {
    recipientName: string;
    senderName: string;
    messagePreview: string;
    senderAvatar?: string | null;
    senderId?: number;
  }
): Promise<void> {
  // Include senderId in the link to open the conversation directly
  const messagesLink = data.senderId 
    ? `${APP_URL}/portal/messages?userId=${data.senderId}` 
    : `${APP_URL}/portal/messages`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">New Message</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${data.recipientName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${data.senderName}</strong> sent you a message on Yassu:
              </p>
              
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #7c3aed; margin: 20px 0;">
                <p style="margin: 0; color: #4a4a4a; font-size: 15px; line-height: 1.6; font-style: italic;">
                  "${data.messagePreview}"
                </p>
              </div>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${messagesLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Message
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: recipientEmail,
    subject: `${data.senderName} sent you a message on Yassu`,
    html,
  });
}

export async function sendSkillMatchEmail(
  userEmail: string,
  userName: string,
  ideaTitle: string,
  ideaProblem: string,
  ideaId: string,
  matchingSkills: string[]
): Promise<void> {
  const ideaLink = `${APP_URL}/portal/ideas/${ideaId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Opportunity Matches Your Skills - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${userName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Great news! A new project has just been posted on Yassu that perfectly matches your expertise in <strong>${matchingSkills.join(', ')}</strong>.
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #7c3aed; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 16px;"><strong>Project:</strong> ${ideaTitle}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;"><strong>Description:</strong> ${ideaProblem}</p>
              </div>
              
              <p style="margin: 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                The project creator is looking for someone with your specific background to help take this idea to the next level. Indicate your interest to join the Team. The Creator will let you know in due course if you are accepted.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${ideaLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Project Details
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: userEmail,
    subject: `New Opportunity Matches Your Skills - ${ideaTitle}`,
    html,
  });
}

export async function sendJoinRequestEmail(
  ownerEmail: string,
  ownerName: string,
  applicantName: string,
  ideaTitle: string,
  role: string,
  skills: string[],
  motivation: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Join Request - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${ownerName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Exciting news! <strong>${applicantName}</strong> has expressed interest in joining your project, <strong>${ideaTitle}</strong>.
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Applicant Details:</h3>
                <ul style="margin: 0; padding: 0; list-style: none; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                  <li><strong>Name:</strong> ${applicantName}</li>
                  <li><strong>Role Interested In:</strong> ${role}</li>
                  <li><strong>Matching Skills:</strong> ${skills.join(', ')}</li>
                </ul>
                <p style="margin: 15px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  <strong>Motivation:</strong> "${motivation}"
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Review their full profile and application on your project dashboard to decide if they're the right fit for your team.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Review Application
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `${applicantName} wants to join ${ideaTitle}`,
    html,
  });
}

export async function sendRequestAcceptedEmail(
  applicantEmail: string,
  applicantName: string,
  ownerName: string,
  ideaTitle: string,
  ideaId: string,
  customMessage?: string
): Promise<void> {
  const ideaLink = `${APP_URL}/portal/ideas/${ideaId}`;
  console.log(`[Email] Acceptance email link: ${ideaLink}`);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the team! - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${applicantName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Congratulations! <strong>${ownerName}</strong> has accepted your request to join the team for <strong>${ideaTitle}</strong>.
              </p>
              
              ${customMessage ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 14px; font-weight: 600;">Message from ${ownerName}:</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  "${customMessage}"
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You are now an official collaborator on the project. You can now access the project workspace, communicate with your new teammates, and start building together.
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: applicantEmail,
    subject: `Welcome to the team! Your request for ${ideaTitle} was accepted`,
    html,
  });
}

export async function sendRequestRejectedEmail(
  applicantEmail: string,
  applicantName: string,
  ownerName: string,
  ideaTitle: string,
  customMessage?: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on your request - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${applicantName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in joining <strong>${ideaTitle}</strong>. After careful consideration, the team has decided to move forward with other candidates at this time.
              </p>
              
              ${customMessage ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #6b7280; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 14px; font-weight: 600;">Message from ${ownerName}:</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  "${customMessage}"
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Don't be discouraged! There are many other exciting projects on Yassu looking for talented collaborators like you. Keep exploring and connecting with the community.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal/ideas" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Explore More Ideas
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: applicantEmail,
    subject: `Update on your request for ${ideaTitle}`,
    html,
  });
}

export async function sendRequestPendingEmail(
  applicantEmail: string,
  applicantName: string,
  ownerName: string,
  ideaTitle: string,
  customMessage?: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your request is under review - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${applicantName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in joining <strong>${ideaTitle}</strong>. ${ownerName} has reviewed your application and would like to take some more time to consider your request.
              </p>
              
              ${customMessage ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 14px; font-weight: 600;">Message from ${ownerName}:</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  "${customMessage}"
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your application is still active and being considered. You will receive another notification once a final decision is made.
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: applicantEmail,
    subject: `Your request for ${ideaTitle} is under review`,
    html,
  });
}

export async function sendConnectionRequestEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  personalMessage?: string,
  connectionId?: string,
  acceptToken?: string
): Promise<void> {
  const acceptUrl = connectionId && acceptToken 
    ? `${APP_URL}/accept-connection?requestId=${connectionId}&token=${acceptToken}`
    : `${APP_URL}/portal/collaborators`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Connection Request - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${recipientName},</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Great news! <strong>${senderName}</strong> wants to connect with you on Yassu!
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Connecting Yassu community is the first step toward building something amazing together.
              </p>
              
              ${personalMessage ? `
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #7c3aed; border-radius: 4px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; font-style: italic; line-height: 1.6;">
                  "${personalMessage}"
                </p>
              </div>
              ` : ''}
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Accept Connection
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Best,<br>
                The Yassu Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: recipientEmail,
    subject: `${senderName} wants to connect on Yassu`,
    html,
  });
}

export interface WeeklyDigestData {
  userName: string;
  weekStart: string;
  weekEnd: string;
  newIdeas: Array<{
    id: string;
    title: string;
    creatorName: string;
    stage: string;
    skills: string[];
  }>;
  skillMatches: Array<{
    id: string;
    title: string;
    creatorName: string;
    matchingSkills: string[];
  }>;
  userActivity: {
    ideasCreated: number;
    invitesReceived: number;
    teamsJoined: number;
  };
  platformStats: {
    totalIdeas: number;
    totalUsers: number;
    newUsersThisWeek: number;
  };
}

export async function sendWeeklyDigestEmail(
  email: string,
  data: WeeklyDigestData
): Promise<void> {
  const { userName, weekStart, weekEnd, newIdeas, skillMatches, userActivity, platformStats } = data;
  
  // Helper function to format idea cards
  const formatIdeaCard = (idea: { id: string; title: string; creatorName: string; stage: string; skills?: string[] }) => `
    <div style="margin: 15px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #7c3aed;">
      <h4 style="margin: 0 0 10px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${idea.title}</h4>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
        <strong>Creator:</strong> ${idea.creatorName} | <strong>Stage:</strong> ${idea.stage}
      </p>
      ${idea.skills && idea.skills.length > 0 ? `
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
        <strong>Skills:</strong> ${idea.skills.join(', ')}
      </p>
      ` : ''}
      <a href="${APP_URL}/portal/ideas/${idea.id}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600;">
        View Idea
      </a>
    </div>
  `;
  
  // Helper function to format skill match cards
  const formatSkillMatchCard = (match: { id: string; title: string; creatorName: string; matchingSkills: string[] }) => `
    <div style="margin: 15px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h4 style="margin: 0 0 10px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${match.title}</h4>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
        <strong>Creator:</strong> ${match.creatorName}
      </p>
      <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; background-color: #fde68a; padding: 8px; border-radius: 4px;">
        <strong>🎯 Matching Skills:</strong> ${match.matchingSkills.join(', ')}
      </p>
      <a href="${APP_URL}/portal/ideas/${match.id}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600;">
        Join Team
      </a>
    </div>
  `;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Yassu Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 32px; font-weight: 700;">Yassu</h1>
              <p style="margin: 0; color: #e9d5ff; font-size: 18px; font-weight: 600;">Your Weekly Digest</p>
              <p style="margin: 10px 0 0; color: #e9d5ff; font-size: 14px;">${weekStart} - ${weekEnd}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Hi ${userName}! 👋</h2>
              <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Here's what happened on Yassu this week:
              </p>
            </td>
          </tr>
          
          ${newIdeas.length > 0 ? `
          <!-- New Ideas Section -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #7c3aed;">
                <h3 style="margin: 0; color: #7c3aed; font-size: 20px; font-weight: 600;">🚀 New Ideas This Week (${newIdeas.length})</h3>
              </div>
              ${newIdeas.slice(0, 10).map(idea => formatIdeaCard(idea)).join('')}
              ${newIdeas.length > 10 ? `
              <p style="margin: 15px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                And ${newIdeas.length - 10} more ideas...
              </p>
              ` : ''}
            </td>
          </tr>
          ` : ''}
          
          ${skillMatches.length > 0 ? `
          <!-- Skill Matches Section -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #f59e0b;">
                <h3 style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 600;">🎯 Ideas Matching Your Skills (${skillMatches.length})</h3>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px;">
                These ideas need your expertise!
              </p>
              ${skillMatches.slice(0, 5).map(match => formatSkillMatchCard(match)).join('')}
            </td>
          </tr>
          ` : ''}
          
          <!-- User Activity Section -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #10b981;">
                <h3 style="margin: 0; color: #10b981; font-size: 20px; font-weight: 600;">📊 Your Activity</h3>
              </div>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 5px;">${userActivity.ideasCreated}</div>
                    <div style="font-size: 14px; color: #6b7280;">Ideas Created</div>
                  </td>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #eff6ff; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #3b82f6; margin-bottom: 5px;">${userActivity.invitesReceived}</div>
                    <div style="font-size: 14px; color: #6b7280;">Invites Received</div>
                  </td>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #fef3c7; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #f59e0b; margin-bottom: 5px;">${userActivity.teamsJoined}</div>
                    <div style="font-size: 14px; color: #6b7280;">Teams Joined</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Platform Stats Section -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #6366f1;">
                <h3 style="margin: 0; color: #6366f1; font-size: 20px; font-weight: 600;">🌐 Platform Stats</h3>
              </div>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #eef2ff; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #6366f1; margin-bottom: 5px;">${platformStats.totalIdeas}</div>
                    <div style="font-size: 14px; color: #6b7280;">Total Ideas</div>
                  </td>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #fce7f3; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #ec4899; margin-bottom: 5px;">${platformStats.totalUsers}</div>
                    <div style="font-size: 14px; color: #6b7280;">Total Users</div>
                  </td>
                  <td style="width: 33.33%; padding: 15px; text-align: center; background-color: #f0fdfa; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #14b8a6; margin-bottom: 5px;">${platformStats.newUsersThisWeek}</div>
                    <div style="font-size: 14px; color: #6b7280;">New This Week</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Section -->
          <tr>
            <td style="padding: 30px 40px;">
              <div style="text-align: center; padding: 30px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  Ready to build something amazing?
                </p>
                <a href="${APP_URL}/portal" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Where Ideas Meet Builders
              </p>
              <p style="margin: 15px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                You're receiving this because you're a member of Yassu.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `Your Weekly Yassu Digest - ${weekStart} to ${weekEnd}`,
    html,
  });
}

export async function sendAnnouncementEmail(
  email: string, 
  fullName: string,
  announcement: {
    title: string;
    message: string;
    type: 'maintenance' | 'event' | 'update' | 'general';
    priority: 'normal' | 'important' | 'urgent';
  }
): Promise<void> {
  const typeLabels: Record<string, string> = {
    maintenance: 'Platform Maintenance',
    event: 'Event Announcement',
    update: 'Platform Update',
    general: 'Announcement',
  };
  
  const priorityColors: Record<string, string> = {
    urgent: '#dc2626',
    important: '#f59e0b',
    normal: '#7c3aed',
  };
  
  const typeLabel = typeLabels[announcement.type] || 'Announcement';
  const priorityColor = priorityColors[announcement.priority] || '#7c3aed';
  const displayName = fullName || 'Yassu User';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${announcement.title} - Yassu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          
          <!-- Type Badge -->
          <tr>
            <td style="padding: 0 40px; text-align: center;">
              <span style="display: inline-block; padding: 6px 16px; background-color: ${priorityColor}; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${typeLabel}${announcement.priority === 'urgent' ? ' - URGENT' : announcement.priority === 'important' ? ' - Important' : ''}
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${displayName},
              </p>
              
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; font-weight: 600;">${announcement.title}</h2>
              
              <div style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${announcement.message}</div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${APP_URL}/portal" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Yassu Portal
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; text-align: center; color: #888; font-size: 14px;">
                You're receiving this because you're a registered member of Yassu.
              </p>
              <p style="margin: 10px 0 0; text-align: center; color: #888; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Yassu. Empowering student founders.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `${announcement.priority === 'urgent' ? '[URGENT] ' : ''}${announcement.title} - Yassu`,
    html,
  });
}

export async function sendIdeaCreatedEmail(
  email: string,
  userName: string,
  ideaTitle: string,
  ideaId: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Your Idea Has Been Created!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Congratulations! Your startup idea <strong>"${ideaTitle}"</strong> has been successfully created on Yassu.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Here's what you can do next:
              </p>
              
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                <li>Generate a business plan with AI assistance</li>
                <li>Find advisors and co-founders to join your team</li>
                <li>Create an investor pitch deck</li>
                <li>Apply for Yassu Foundry events</li>
              </ul>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal/ideas/${ideaId}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Your Idea
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                We're excited to be part of your entrepreneurship journey!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `Your idea "${ideaTitle}" has been created - Yassu`,
    html,
  });
}

export async function sendAdvisorRequestSentEmail(
  email: string,
  userName: string,
  advisorName: string,
  ideaTitle: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Advisor Request Sent!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You've sent an advisor request to <strong>${advisorName}</strong> for your idea <strong>"${ideaTitle}"</strong>.
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  We'll notify you as soon as ${advisorName} responds to your request.
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                In the meantime, you can continue building your business plan and exploring other potential advisors on the platform.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal/advisors" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Browse More Advisors
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `Advisor request sent to ${advisorName} - Yassu`,
    html,
  });
}

export async function sendCollaboratorRequestAcceptedEmail(
  email: string,
  userName: string,
  accepterName: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #22c55e; font-size: 24px; font-weight: 600;">Connection Accepted!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Great news! <strong>${accepterName}</strong> has accepted your collaborator request.
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  You can now message ${accepterName} directly and collaborate on projects together!
                </p>
              </div>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${APP_URL}/portal/collaborators" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Your Connections
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Start a conversation and explore how you can work together!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} Yassu. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `${accepterName} accepted your connection request - Yassu`,
    html,
  });
}

// Send acknowledgement email to investor who expressed interest
export async function sendInvestorAcknowledgementEmail(
  email: string,
  investorName: string,
  ideaTitle: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Investment Interest Received - Yassu</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #059669 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .highlight-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Investment Interest Received</h1>
        </div>
        <div class="content">
          <p>Hi ${investorName},</p>
          
          <p>Thank you for expressing your interest in investing in <strong>"${ideaTitle}"</strong> on Yassu.</p>
          
          <div class="highlight-box">
            <p style="margin: 0;"><strong>What happens next?</strong></p>
            <p style="margin: 10px 0 0 0;">The Yassu team will review your interest and contact you within <strong>3 working days</strong> to discuss the opportunity further.</p>
          </div>
          
          <p>In the meantime, feel free to explore other innovative ideas on our platform.</p>
          
          <p>Best regards,<br>The Yassu Team</p>
        </div>
        <div class="footer">
          <p>Yassu - Where Ideas Meet Builders</p>
          <p>&copy; ${new Date().getFullYear()} Yassu. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Investment Interest Received - ${ideaTitle} | Yassu`,
    html,
  });
}

// Send notification to admin about new investor interest
export async function sendAdminInvestorNotificationEmail(
  ideaTitle: string,
  investorName: string,
  investorEmail: string,
  investorType: string,
  investmentRange: string,
  motivation: string
): Promise<void> {
  const adminEmail = 'paulinet77@gmail.com'; // Admin email

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Investor Interest - Yassu Admin</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #059669 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .info-box { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: 600; width: 140px; color: #6b7280; }
        .info-value { flex: 1; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Investor Interest</h1>
        </div>
        <div class="content">
          <p>A new investor has expressed interest in a startup idea on Yassu.</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Idea:</span>
              <span class="info-value"><strong>${ideaTitle}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Investor Name:</span>
              <span class="info-value">${investorName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value"><a href="mailto:${investorEmail}">${investorEmail}</a></span>
            </div>
            <div class="info-row">
              <span class="info-label">Investor Type:</span>
              <span class="info-value">${investorType}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Investment Range:</span>
              <span class="info-value">${investmentRange}</span>
            </div>
          </div>
          
          <p><strong>Their Message:</strong></p>
          <p style="background: #f0fdf4; padding: 15px; border-radius: 8px; font-style: italic;">"${motivation}"</p>
          
          <p style="margin-top: 30px; color: #6b7280;">Please contact the investor within 3 working days as promised.</p>
        </div>
        <div class="footer">
          <p>Yassu Admin Notification</p>
          <p>&copy; ${new Date().getFullYear()} Yassu. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: adminEmail,
    subject: `[ACTION REQUIRED] New Investor Interest: ${ideaTitle}`,
    html,
  });
}

export async function sendGroupInviteEmail(
  email: string,
  groupName: string,
  inviterName: string,
  acceptUrl: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 700;">Yassu</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 22px;">You're invited to join ${groupName}!</h2>
              <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                ${inviterName} has invited you to join <strong>${groupName}</strong> on Yassu — the platform where university founders turn ideas into startups.
              </p>
              <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                As a member, you'll be able to post startup ideas, find co-founders, and access AI-powered business tools alongside your group.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
              </div>
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Yassu. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${groupName} on Yassu!`,
    html,
  });
}

export async function sendApplicationConfirmationEmail(email: string, fullName: string, groupName: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="color:#1a1a2e;font-size:22px;margin:0 0 6px 0;">Application Received!</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">Thank you for applying, ${fullName}.</p>
    </div>
    <div style="background:#f0f9ff;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">📋 ${groupName}</p>
      <p style="margin:8px 0 0 0;color:#374151;font-size:14px;">Your application has been submitted successfully and is now under review. You'll be notified once a decision is made.</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/auth" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Log In to Yassu</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">© ${new Date().getFullYear()} Yassu. All rights reserved.</p>
</div>
</body>
</html>
  `;
  await sendEmail({ to: email, subject: `Application Received — ${groupName}`, html });
}

export async function sendAdminApplicationNotificationEmail(adminEmail: string, adminName: string, applicantName: string, applicantEmail: string, groupName: string, groupSlug: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="color:#1a1a2e;font-size:22px;margin:0 0 6px 0;">New Application</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">A new application has been submitted to ${groupName}.</p>
    </div>
    <div style="background:#fef3c7;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#92400e;"><strong>Applicant:</strong> ${applicantName}</p>
      <p style="margin:6px 0 0 0;font-size:14px;color:#92400e;"><strong>Email:</strong> ${applicantEmail}</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;">Hi ${adminName}, please review this application at your earliest convenience.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${APP_URL}/portal/group-admin" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review Applications</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">© ${new Date().getFullYear()} Yassu. All rights reserved.</p>
</div>
</body>
</html>
  `;
  await sendEmail({ to: adminEmail, subject: `New Application: ${applicantName} — ${groupName}`, html });
}

export async function sendSuperAdminApplicationNotificationEmail(superAdminEmail: string, applicantName: string, applicantEmail: string, groupName: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="color:#1a1a2e;font-size:22px;margin:0 0 6px 0;">New Group Application</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">A new application was submitted on Yassu.</p>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#166534;"><strong>Group:</strong> ${groupName}</p>
      <p style="margin:6px 0 0 0;font-size:14px;color:#166534;"><strong>Applicant:</strong> ${applicantName}</p>
      <p style="margin:6px 0 0 0;font-size:14px;color:#166534;"><strong>Email:</strong> ${applicantEmail}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/portal/admin" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Admin Dashboard</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">© ${new Date().getFullYear()} Yassu. All rights reserved.</p>
</div>
</body>
</html>
  `;
  await sendEmail({ to: superAdminEmail, subject: `[Admin] New Application: ${applicantName} — ${groupName}`, html });
}
