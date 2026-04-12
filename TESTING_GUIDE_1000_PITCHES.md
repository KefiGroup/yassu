# Testing Guide: 1000 Pitches Application Workflow

**Important:** Use fresh email addresses that have never been used on Yassu before. Gmail trick: if your email is `jane@gmail.com`, you can use `jane+test1@gmail.com`, `jane+test2@gmail.com`, etc. — they all arrive in your inbox but Yassu treats them as separate accounts.

---

## Test 1: Submit a New Application (Public Form — No Account)

This tests the main flow a brand-new applicant would experience.

### Steps

1. Open the application form in an **incognito/private browser window** (so you're not logged in):
   **https://www.yassu.ai/bruin/apply/bruin**

2. You should see:
   - Yassu header/nav bar at the top
   - A blue sidebar on the left with "Bruin Entrepreneurs" branding and the 1000 Pitches description
   - The application form on the right

3. Fill out the form:
   - **First Name** / **Last Name**: Use a test name (e.g., "Test Tester")
   - **Email Address**: Use a fresh email you can check (e.g., `yourname+test1@gmail.com`)
   - **University Name**: e.g., "UCLA"
   - **Year of Graduation**: e.g., "2027"
   - **Major**: e.g., "Business Economics"
   - **Project Title**: e.g., "Campus Eats"
   - **Team Member Emails**: Add 1–2 email addresses you can check (e.g., `yourname+teammate1@gmail.com`)
   - Answer all 6 required questions (even short answers are fine for testing)

4. Click **Submit Application**

5. You should see a confirmation page that says:
   > "Your 1000 Pitches Application Saved!"

   with a button to **"Go to Login to Create Your Account"**

### What to Verify (Emails)

Check the following inboxes. All emails should arrive within 1–2 minutes:

| Inbox to Check | Email You Should Receive | Subject Line |
|---|---|---|
| The applicant email you used | Application confirmation | "Your 1000 Pitches Application Saved!" |
| The applicant email you used | Account created | "Your Yassu Account Has Been Created" |
| Each team member email you listed | Team member notification | "You've been named as a team member for [Project Title] — 1000 Pitches" |
| paulinet77@gmail.com (group admin) | Admin notification | "New Application: [Name] — Bruin Entrepreneurs" |

**Note:** The super admin (paulinet77@gmail.com) is also the group owner, so she receives ONE email (the admin notification), not two.

---

## Test 2: Log In to Your New Account

1. From the confirmation page, click **"Go to Login to Create Your Account"**
   — OR go to: **https://www.yassu.ai/auth**

2. Your "Account Created" email contains a temporary password. Find it in your inbox.

3. Log in with:
   - **Email**: The email you used to apply
   - **Password**: The temporary password from the email

4. You should land on the Yassu dashboard.

5. On the dashboard, you should see a **"My Applications"** section showing your application to Bruin Entrepreneurs with status **"Pending"**.

---

## Test 3: Edit Your Application (Logged In)

1. While logged in, navigate to your application (click on it from the dashboard, or go to the group page).

2. You should be able to edit your answers, project title, university info, and team member emails.

3. Make a change and save.

4. Verify the changes are saved by refreshing the page.

---

## Test 4: Admin Reviews Applications

This requires logging in as a group admin or super admin.

1. Log in as **paulinet77@gmail.com** (group owner) at:
   **https://www.yassu.ai/auth**

2. Navigate to the Group Admin panel:
   **https://www.yassu.ai/portal/group-admin**

3. Click the **"Applicants"** tab.

4. You should see the test application(s) you submitted, showing:
   - Applicant name and email
   - Project title
   - University, graduation year, major
   - Team member emails
   - Status (Pending)
   - All question answers

5. **Approve or Reject** the application:
   - Click **Approve** or **Reject** on a test application
   - The status should update immediately

6. **Export CSV**:
   - Click the **"Export CSV"** button in the applicants tab header
   - A CSV file should download containing all applications with all fields (including each custom question as a separate column)

---

## Test 5: Draft Application (Logged-In User Flow)

This tests what happens when a logged-in user starts an application but doesn't finish.

1. Log in with a **different fresh email** account (create one first at https://www.yassu.ai/auth by registering).

2. Navigate to the Bruin group and start an application.

3. Fill in some fields but **save as draft** (don't submit).

4. Log out, log back in — your draft should still be there.

5. Complete the draft and submit it.

6. Verify all the same emails are sent (confirmation, admin notification, team member notifications if you added any).

---

## Test 6: 12-Hour Reminder (Cannot Fully Test Manually)

This is an automated background job. Here's what it does:

- If someone submits a **public application** that creates a draft (saves but doesn't complete account creation), and **12 hours pass** without them logging in to submit, the system sends a reminder email.
- The reminder is sent only **once** (tracked by a `reminder_sent` flag).
- The system checks every 15 minutes.

**To confirm it's running:** Check the server logs for:
> `[Background Jobs] Starting application reminder job (checking every 15 minutes)`

---

## Test 7: Team Member Auto-Attach

1. In Test 1, you listed team member emails (e.g., `yourname+teammate1@gmail.com`).

2. Now go to **https://www.yassu.ai/auth** in a new incognito window.

3. **Register a new account** using one of those team member emails.

4. After creating the account, that team member should be automatically attached to the Bruin Entrepreneurs group.

---

## Test 8: Bruin Landing Page

1. Visit: **https://www.yassu.ai/bruin**

2. You should see the Bruin Entrepreneurs branded content but with the standard Yassu navigation bar and footer.

3. There should be a visible link/path to the application form.

---

## Quick Checklist

| # | Test | Pass? |
|---|---|---|
| 1 | Public application form loads correctly at `/bruin/apply/bruin` | |
| 2 | Application submits successfully, confirmation page shows | |
| 3 | Applicant receives "Application Saved" email | |
| 4 | Applicant receives "Account Created" email with temp password | |
| 5 | Team members receive notification emails | |
| 6 | Group admin (paulinet77) receives ONE admin notification email | |
| 7 | Can log in with temp password from email | |
| 8 | Dashboard shows application with "Pending" status | |
| 9 | Can edit application while logged in | |
| 10 | Admin can view all applications in Group Admin panel | |
| 11 | Admin can see university, major, grad year, project title, team emails | |
| 12 | Admin can approve/reject applications | |
| 13 | CSV export downloads with all fields and custom question columns | |
| 14 | Bruin landing page (`/bruin`) shows correct branding | |
| 15 | No duplicate emails sent to the same person | |

---

## Troubleshooting

- **Emails not arriving?** Check your spam/junk folder. Emails come from Yassu via Resend.
- **Can't log in?** Make sure you're using the exact email you applied with (case doesn't matter) and the temporary password from the "Account Created" email.
- **Application not showing for admin?** Make sure you're logged in as paulinet77@gmail.com and on the Group Admin page, Applicants tab.
- **Page not loading?** Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
