# Bruin Entrepreneurs x Yassu.ai
# 1000 Pitches Platform Training Guide

---

## Table of Contents

1. [Overview](#1-overview)
2. [Key URLs](#2-key-urls)
3. [How Students Apply (The Applicant Experience)](#3-how-students-apply-the-applicant-experience)
   - 3.1 Accessing the Application Form
   - 3.2 Filling Out the Application (New Users)
   - 3.3 Filling Out the Application (Existing Users)
   - 3.4 Adding Team Members
   - 3.5 What Happens After Submission
   - 3.6 Logging In for the First Time (Temporary Password)
   - 3.7 Editing an Application After Submission
   - 3.8 Submitting Multiple Applications
4. [What Team Members See](#4-what-team-members-see)
5. [Emails Sent Automatically](#5-emails-sent-automatically)
6. [Admin Guide: Managing Applications](#6-admin-guide-managing-applications)
   - 6.1 Accessing the Group Admin Panel
   - 6.2 Reviewing Applications
   - 6.3 Approving or Rejecting Applications
   - 6.4 Exporting Applications to CSV
   - 6.5 Editing Application Questions
   - 6.6 Post-Submission Settings
7. [Admin Guide: Managing Members](#7-admin-guide-managing-members)
   - 7.1 Viewing Members
   - 7.2 Changing Member Roles
   - 7.3 Removing Members
   - 7.4 Sending Invitations
8. [Admin Guide: Group Settings](#8-admin-guide-group-settings)
   - 8.1 Editing Group Info and Branding
   - 8.2 Managing the Group Logo
9. [The Student Dashboard](#9-the-student-dashboard)
   - 9.1 Dashboard Overview
   - 9.2 My Applications Section
   - 9.3 My Groups Page
10. [Roles Explained](#10-roles-explained)
11. [Frequently Asked Questions](#11-frequently-asked-questions)

---

## 1. Overview

Yassu.ai is the platform partner for Bruin Entrepreneurs' **1000 Pitches** competition. It handles the entire application lifecycle:

- Students apply through a branded application form
- Accounts are created automatically for new applicants
- Admins review, approve, or reject applications from a management dashboard
- Team members are notified and connected to applications automatically
- All notification emails are sent automatically

This guide walks through every step of the process for both applicants and administrators.

---

## 2. Key URLs

| Purpose | URL |
|---|---|
| **Application Form** (primary link to share) | **https://yassu.ai/apply/bruin** |
| **Application Form** (Bruin-branded alternate) | https://yassu.ai/bruin/apply/bruin |
| **Bruin Landing Page** | https://yassu.ai/bruin |
| **Login / Create Account** | https://yassu.ai/auth |
| **Student Dashboard** (after login) | https://yassu.ai/portal |
| **My Groups** (after login) | https://yassu.ai/portal/groups |
| **Group Admin Panel** (admins only) | https://yassu.ai/portal/group-admin |
| **Group Admin Panel** (direct link for Bruin) | https://yassu.ai/portal/group-admin?group=bruin |

**Which link should you share with students?**
Use **https://yassu.ai/apply/bruin** -- this is the cleanest, most direct link to the application form.

---

## 3. How Students Apply (The Applicant Experience)

### 3.1 Accessing the Application Form

Students visit **https://yassu.ai/apply/bruin**. They see a two-panel layout:

- **Left side:** Bruin Entrepreneurs branding, logo, and group description
- **Right side:** The application form

No account is required to start an application.

---

### 3.2 Filling Out the Application (New Users)

Students who do **not** already have a Yassu account see the full application form with these sections:

**Personal Information:**
- First Name (required)
- Last Name (required)
- Email Address (required)
- University (required)
- Graduation Year (required)
- Major (required)

**Project Details:**
- Project Title (text field for the name of their startup/idea)

**Application Questions:**
- These are the custom questions that Bruin admins have configured in the Group Admin panel (e.g., "Describe your startup idea," "What problem does it solve?")
- Questions can be short text, long text, or file upload fields
- Required questions are marked with an asterisk

**Team Members:**
- An "Invite Team Members" section where applicants can type in email addresses of their teammates
- Each email is added as a "chip" (a small tag) -- press Enter or comma after each email
- Team members will receive a notification email inviting them to create a Yassu account

---

### 3.3 Filling Out the Application (Existing Users)

Students who are **already logged in** to Yassu see a streamlined form:

- Personal info fields (name, email, university, graduation year, major) are **skipped** -- this information is pulled automatically from their Yassu profile
- They only see: Project Title, Application Questions, and Team Members
- After submission, they are redirected directly to their Dashboard

---

### 3.4 Adding Team Members

In both the new-user and existing-user forms:

1. Scroll to the **"Invite Team Members"** section at the bottom of the form
2. Type a teammate's email address
3. Press **Enter** or type a **comma** to add it
4. Repeat for additional team members
5. To remove a team member, click the **X** next to their email

Each listed team member will:
- Receive an email notification that they've been named as a team member
- Be automatically added to the Bruin Entrepreneurs group as a member when they create their Yassu account

---

### 3.5 What Happens After Submission

When a **new user** (no existing account) submits the application:

1. A Yassu account is automatically created using their email address
2. A temporary password is generated
3. The application is saved with a **"Pending"** status
4. The student sees a confirmation page with a success message
5. A **"Submit Another Application"** button is available if they want to apply with a different project

The following emails are sent automatically (see Section 5 for details):
- **To the applicant:** Account creation email with their temporary password
- **To the applicant:** Application confirmation email
- **To each team member listed:** Team member notification email
- **To Bruin admin(s):** New application notification
- **To Yassu super admin(s):** New application notification

When a **logged-in user** submits:
- They are redirected to their Dashboard
- The same notification emails are sent (minus the account creation email)

---

### 3.6 Logging In for the First Time (Temporary Password)

When a new user receives their account creation email:

1. They click **"Go to Login"** in the email, which takes them to **https://yassu.ai/auth**
2. They log in using their email and the temporary password from the email
3. **Immediately after login**, a **"Set Your Password"** dialog appears
   - This dialog **cannot be dismissed** -- the user must change their password before doing anything else
   - It asks for: Temporary Password, New Password (minimum 8 characters), and Confirm New Password
4. After setting a new password, the page refreshes and they can use the platform normally

**Important:** Until the user changes their temporary password, they cannot access any features on the platform. The system blocks all actions except the password change.

---

### 3.7 Editing an Application After Submission

After logging in, students can review and edit their submitted application:

1. Go to the **Dashboard** (https://yassu.ai/portal)
2. In the **"My Applications"** section, find the application
3. Click **"Edit"** (for pending applications) or **"View"** (for approved/rejected ones)
4. This opens the **Application Editor** at https://yassu.ai/portal/applications/bruin
5. Students can update their answers, project title, and team member list
6. Click **"Save Changes"** to update

If a student adds new team member emails while editing, those new team members will also receive notification emails.

---

### 3.8 Submitting Multiple Applications

Students can submit **more than one application** to 1000 Pitches. This is useful if a student has multiple project ideas.

- After submitting one application, the confirmation page shows a **"Submit Another Application"** button
- On the Dashboard, a **"New Application"** button appears next to the "My Applications" heading
- On the My Groups page, a **"New Application"** button is also available
- Each application is tracked independently with its own status (Pending, Approved, Rejected)

---

## 4. What Team Members See

When an applicant lists team member emails in their application:

1. Each team member receives an email saying they've been named as a team member for a specific project
2. The email invites them to create a Yassu account at https://yassu.ai/auth
3. When the team member creates an account (using the same email address that was listed), they are **automatically added** to the Bruin Entrepreneurs group as a member
4. They can then see the group in their Dashboard under "My Groups"

---

## 5. Emails Sent Automatically

The platform sends the following emails automatically during the application process. All emails come from **hello@yassu.ai**.

### 5.1 Account Creation Email
- **To:** The applicant (new users only)
- **Subject:** "Your Yassu Account Has Been Created"
- **Content:** Welcome message, their email address, their temporary password, a warning to change the password after first login, and a "Go to Login" button
- **When sent:** Immediately when a new user submits an application

### 5.2 Application Confirmation Email
- **To:** The applicant
- **Subject:** "Your 1000 Pitches Application Saved!"
- **Content:** Confirmation that the application was received, instructions to log in to review/edit, and a "Go to Login" button
- **When sent:** Immediately after submission

### 5.3 Team Member Notification Email
- **To:** Each email address listed as a team member
- **Subject:** "You've been named as a team member for [Project Title] -- 1000 Pitches"
- **Content:** Informs the team member that [Applicant Name] submitted [Project Title] and named them as a team member, explains Yassu is the platform partner, and includes a "Go to Login to Create Your Account" button
- **When sent:** Immediately after submission, and also when new team members are added during application editing

### 5.4 Admin Notification Email
- **To:** Bruin Entrepreneurs group admins and owners
- **Subject:** "New Application: [Applicant Name] -- Bruin Entrepreneurs"
- **Content:** Shows the applicant's name and email, asks the admin to review, includes a "Review Applications" button linking to the Group Admin panel
- **When sent:** Immediately after submission

### 5.5 Super Admin Notification Email
- **To:** Yassu platform super admins
- **Subject:** "[Admin] New Application: [Applicant Name] -- Bruin Entrepreneurs"
- **Content:** Shows the group name, applicant name, and email, with a link to the Admin Dashboard
- **When sent:** Immediately after submission (deduplicated -- if a super admin is also a group admin, they only receive the admin notification)

### 5.6 Application Reminder Email
- **To:** Applicants who started but haven't submitted
- **Subject:** "Complete Your 1000 Pitches Application"
- **Content:** Reminds them to complete and submit their application, with a login link
- **When sent:** Automatically, 12 hours after the application was started (sent only once per application)

---

## 6. Admin Guide: Managing Applications

### 6.1 Accessing the Group Admin Panel

1. Log in to Yassu at **https://yassu.ai/auth**
2. Navigate to the Group Admin panel:
   - **Option A:** Click **"Manage"** next to Bruin Entrepreneurs in your Dashboard or My Groups page
   - **Option B:** Go directly to **https://yassu.ai/portal/group-admin?group=bruin**
3. You must have an **Owner**, **Admin**, or **Judge** role for the Bruin Entrepreneurs group to access this panel

---

### 6.2 Reviewing Applications

1. In the Group Admin panel, click the **"Applicants"** tab
2. You see a list of all applications with:
   - Applicant name and avatar
   - Email address
   - University and major
   - Project title
   - Application status (Draft, Pending, Approved, or Rejected)
3. Click on an application to expand it and see:
   - All answers to the application questions
   - Team member emails
   - Full applicant profile details

---

### 6.3 Approving or Rejecting Applications

1. Open the **"Applicants"** tab
2. Find the application you want to review
3. Click the **"Approve"** button (green, with a thumbs-up icon) or the **"Reject"** button (red, with a thumbs-down icon)
4. When you approve an application:
   - The applicant is automatically added to the Bruin Entrepreneurs group as a **member**
   - Their application status changes to **Approved**
5. When you reject an application:
   - Their status changes to **Rejected**
   - The applicant can submit a new application if they wish

---

### 6.4 Exporting Applications to CSV

1. In the **"Applicants"** tab, click the **"Export CSV"** button
2. A CSV file downloads with columns for:
   - Applicant name, email, university, graduation year, major
   - Project title
   - Team member emails
   - Answers to each application question
   - Application status
   - Submission date

---

### 6.5 Editing Application Questions

Admins can customize the questions that appear on the application form:

1. Go to the **"Overview"** tab in the Group Admin panel
2. Scroll to the **"Application Questions"** section
3. To **add a question:**
   - Click "Add Question"
   - Enter the question text
   - Choose the field type: Short text, Long text, or File upload
   - Check "Required" if the question is mandatory
4. To **reorder questions:** Drag and drop them into the desired order
5. To **remove a question:** Click the delete icon next to it
6. Click **"Save"** to apply changes

Changes take effect immediately -- new applicants will see the updated questions.

---

### 6.6 Post-Submission Settings

Admins can customize what applicants see after they submit their application:

1. In the **"Overview"** tab, scroll to **"Post-Submission Settings"**
2. Available options:
   - **Redirect URL:** Enter a URL to redirect applicants to after submission (e.g., a thank-you page on your own website)
   - **Submission Message:** Write a custom confirmation message that replaces the default "Application submitted successfully" text
   - **Submission File:** Upload a file (PDF, document, or image) that applicants can download from the confirmation page
3. Click **"Save"** to apply

---

## 7. Admin Guide: Managing Members

### 7.1 Viewing Members

1. In the Group Admin panel, click the **"Members"** tab
2. You see a list of all group members with:
   - Name and avatar
   - Email
   - Current role (Owner, Admin, Member, or Judge)
3. Use the search bar to find specific members by name or email

---

### 7.2 Changing Member Roles

1. In the **"Members"** tab, find the member whose role you want to change
2. Click the role dropdown next to their name
3. Select the new role: **Owner**, **Admin**, **Member**, or **Judge**
4. The change takes effect immediately

See Section 10 for what each role can do.

---

### 7.3 Removing Members

1. In the **"Members"** tab, find the member you want to remove
2. Click the **"Remove"** button (person-minus icon) next to their name
3. Confirm the removal
4. The member loses access to the group

---

### 7.4 Sending Invitations

You can invite people to join the group directly:

1. Click the **"Invites"** tab in the Group Admin panel
2. **Individual invite:** Enter an email address and click "Send Invite"
3. **Bulk invite:** Click "Import CSV" and upload a `.csv` or `.txt` file containing email addresses (one per line)
4. The "Invites" tab also shows:
   - All pending invitations
   - Options to **resend** a reminder or **revoke** a pending invite

---

## 8. Admin Guide: Group Settings

### 8.1 Editing Group Info and Branding

1. Go to the **"Overview"** tab in the Group Admin panel
2. Editable fields include:
   - **Group Name**
   - **Description** (rich text editor with formatting options)
   - **Primary Color** (the main brand color used in the application form sidebar and group branding)
   - **Accent Color** (secondary brand color)
3. Click **"Save"** to apply changes

---

### 8.2 Managing the Group Logo

1. In the **"Overview"** tab, find the logo section
2. Click **"Upload Logo"** to add or replace the group logo
3. Click **"Delete Logo"** to remove the current logo
4. The logo appears on:
   - The application form (left sidebar)
   - The Group Admin panel header
   - Group listings throughout the platform

---

## 9. The Student Dashboard

### 9.1 Dashboard Overview

After logging in, students land on their Dashboard at **https://yassu.ai/portal**. The Dashboard shows:

- **Welcome message** with the student's name
- **Profile completion banner** (if their profile is missing information like bio, skills, or university)
- **1000 Pitches banner** -- a prominent card encouraging them to apply or submit a new application, with an "Apply Now" or "New Application" button
- **My Applications** -- a list of all their submitted applications and their statuses

---

### 9.2 My Applications Section

Each application is displayed as a card showing:

| Status | What it looks like | Available actions |
|---|---|---|
| **Pending** | Amber clock icon, "Under Review" badge | "Edit" button (opens Application Editor) |
| **Approved** | Green checkmark icon, "Approved" badge | "View" button |
| **Rejected** | Red X icon, "Rejected" badge | "View" button |
| **Draft** | Blue clipboard icon, "Saved -- not yet submitted" text | "Continue" button |

A **"+ New Application"** button in the section header allows submitting additional applications.

---

### 9.3 My Groups Page

Students can also view their group affiliations at **https://yassu.ai/portal/groups** (accessible via the sidebar under "My Groups"):

**My Memberships:**
- Shows groups the student is a member of
- Displays their role (Owner, Admin, Judge, or Member) with a corresponding icon
- Admin/Owner/Judge roles see a "Manage" button linking to the Group Admin panel

**My Applications:**
- Lists all applications with status badges and action buttons
- Includes a "New Application" button

**Discover Groups:**
- Shows available groups the student hasn't joined yet
- Each group card has an "Apply" button

---

## 10. Roles Explained

| Role | What they can do |
|---|---|
| **Owner** | Full control: edit group settings, manage questions, review applications, approve/reject, manage members and roles, send invites, manage ideas. Only one owner per group. Can transfer ownership. |
| **Admin** | Same as Owner, except cannot transfer ownership or change the Owner's role. |
| **Judge** | Can view applications and rate/score submitted ideas. Cannot approve/reject applications or manage members. |
| **Member** | Standard group member. Can view group information but cannot access the admin panel. |

---

## 11. Frequently Asked Questions

**Q: A student says they never received their account creation email. What should I do?**
A: Ask them to check their spam/junk folder. The email comes from hello@yassu.ai with the subject "Your Yassu Account Has Been Created." If they still can't find it, they can use the "Forgot Password" link on the login page (https://yassu.ai/auth) to reset their password.

**Q: Can a student submit more than one application?**
A: Yes. Students can submit multiple applications to 1000 Pitches, each with a different project. Each application is reviewed independently.

**Q: What happens if I reject an application? Can the student re-apply?**
A: Yes. If an application is rejected, the student can submit a new, separate application.

**Q: A student says they're "locked out" after logging in and sees a password change screen. Is this normal?**
A: Yes. Students whose accounts were created automatically (during the application process) are required to set a new password on their first login. This is a security measure since the initial password is temporary. They need to enter their temporary password and choose a new one (at least 8 characters).

**Q: How do I add another admin for Bruin Entrepreneurs?**
A: Go to the Group Admin panel > Members tab. Find the person (they must already be a member of the group). Click the role dropdown next to their name and select "Admin."

**Q: Can I change the application questions after people have already applied?**
A: Yes. New applicants will see the updated questions. Existing applications retain the answers to the original questions.

**Q: How do team member invitations work?**
A: When an applicant lists team member emails, each team member receives an email inviting them to create a Yassu account. When they create an account using that same email address, they are automatically added to the Bruin Entrepreneurs group as a member.

**Q: Where can I see all applications at a glance?**
A: Use the **Export CSV** button in the Applicants tab of the Group Admin panel. This downloads a spreadsheet with all application data.

**Q: What's the difference between https://yassu.ai/apply/bruin and https://yassu.ai/bruin/apply/bruin?**
A: Both lead to the same application form. The first URL (https://yassu.ai/apply/bruin) is shorter and cleaner -- we recommend sharing this one.

**Q: Is there a deadline feature for applications?**
A: The platform does not currently have a built-in deadline. If you need to stop accepting applications, contact the Yassu team to disable the form.

**Q: Can I see which emails were sent and whether they were delivered?**
A: Yes. Yassu super admins can view the Email Log in the Admin Dashboard, which shows all sent emails with recipient, subject, status (sent/failed), and timestamp. Contact the Yassu team if you need to check on a specific email.

---

*Last updated: April 2026*
*For technical support, contact the Yassu team.*
