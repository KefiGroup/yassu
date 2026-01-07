# Complete DNS Records for yassu.ai Domain

**Domain:** yassu.ai  
**Email Sender:** hello@yassu.ai  
**Purpose:** Enable email sending through Resend

---

## Instructions

1. Log in to GoDaddy DNS management for yassu.ai
2. Add each DNS record exactly as specified below
3. Wait 5-30 minutes for DNS propagation
4. Return to Resend and click "Verify DNS Records"
5. Once verified, emails will be sent successfully from hello@yassu.ai

---

## DNS Records to Add

### 1. DKIM (Domain Verification) - REQUIRED

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | resend._domainkey |
| **Value** | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDcVPYU8k020vvO+P33eXCRc6MZfALRG+ixCubxU6xan0YTKLq4lI7qXKDeYZd9Pc3aBxtuG+1zJd9wAjFjesIuBGeAvfFwcZqKJfhOWvGJImEXZDLNlq7H0tO1vYJAu6AJuETQeG1iRmaCc0i7Nd6bH/0FIdQ2rjdf2EgE68AUKwIDAQAB` |
| **TTL** | Auto (or 3600) |
| **Priority** | - |

---

### 2. SPF - MX Record (Enable Sending) - REQUIRED

| Field | Value |
|-------|-------|
| **Type** | MX |
| **Name** | send |
| **Value** | feedback-smtp.ap-northeast-1.amazonses.com |
| **TTL** | Auto (or 3600) |
| **Priority** | 10 |

---

### 3. SPF - TXT Record (Enable Sending) - REQUIRED

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | send |
| **Value** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | Auto (or 3600) |
| **Priority** | - |

---

### 4. MX Record (Enable Receiving) - OPTIONAL

| Field | Value |
|-------|-------|
| **Type** | MX |
| **Name** | @ |
| **Value** | inbound-smtp.ap-northeast-1.amazonaws.com |
| **TTL** | Auto (or 3600) |
| **Priority** | 0 |

**Note:** This record is only needed if you want to receive emails at yassu.ai. If you only want to send emails, you can skip this record.

---

### 5. DMARC (Optional but Recommended)

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | _dmarc |
| **Value** | `v=DMARC1; p=none;` |
| **TTL** | Auto (or 3600) |
| **Priority** | - |

**Note:** DMARC helps prevent email spoofing and improves deliverability. This is optional but highly recommended.

---

## Important Notes

1. **Copy the DKIM value exactly** - It's very long and must be copied completely
2. **DNS propagation** can take 5-30 minutes (sometimes up to 48 hours)
3. **The "send" subdomain** is used for the Return-Path address
4. **After adding records**, go to Resend and click "Verify DNS Records"
5. **Email sender will be**: hello@yassu.ai (updated from noreply@yassu.ai)

---

## After Verification

Once the domain is verified in Resend:
- Welcome emails will be sent to new users
- Password reset emails will work
- Team invitation emails will be sent
- Skill match notification emails will be sent

All emails will come from: **hello@yassu.ai**

---

## Troubleshooting

If verification fails:
1. Double-check all records are added correctly
2. Wait longer for DNS propagation (up to 48 hours)
3. Use a DNS checker tool to verify records are visible
4. Check GoDaddy DNS management for any typos
5. Contact Resend support if issues persist
