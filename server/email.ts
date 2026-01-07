import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@yassu.ai';
const APP_URL = process.env.APP_URL || 'https://www.yassu.ai';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
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
                Where Elite University Talent Builds Together
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
                Where Elite University Talent Builds Together
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

export async function sendTeamInvitationEmail(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  ideaTitle: string,
  ideaId: string,
  personalMessage?: string
): Promise<void> {
  const ideaLink = `${APP_URL}/portal/ideas/${ideaId}`;
  
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
                    <a href="${ideaLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
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
                Where Elite University Talent Builds Together
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
                Where Elite University Talent Builds Together
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
                Where Elite University Talent Builds Together
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
  ideaId: string
): Promise<void> {
  const ideaLink = `${APP_URL}/portal/ideas/${ideaId}`;
  
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
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You are now an official collaborator on the project. You can now access the project workspace, communicate with your new teammates, and start building together.
              </p>
              
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="${ideaLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Go to Project Workspace
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
                Where Elite University Talent Builds Together
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

export async function sendConnectionRequestEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  personalMessage?: string
): Promise<void> {
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
                    <a href="${APP_URL}/portal/messages" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Request
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
                Where Elite University Talent Builds Together
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
                Where Elite University Talent Builds Together
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
