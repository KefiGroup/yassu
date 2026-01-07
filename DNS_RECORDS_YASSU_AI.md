# DNS Records for yassu.ai Domain Verification

**Domain:** yassu.ai  
**Registrar:** GoDaddy  
**Purpose:** Enable email sending through Resend

## Instructions

Access the DNS settings page of GoDaddy and add all the following DNS records. Once all are added, click the "Verify DNS Records" button in Resend.

---

## 1. Domain Verification - DKIM

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | resend._domainkey |
| **Value** | p=MIGfMA0GCSqGSIb3DQEB... (see Resend dashboard for full value) |
| **TTL** | Auto |
| **Priority** | - |
| **Status** | Not Started |

---

## 2. Enable Sending - SPF

### Record 1: MX Record

| Field | Value |
|-------|-------|
| **Type** | MX |
| **Name** | send |
| **Value** | feedback-smtp.ap-northeast-1.amazonses.com |
| **TTL** | Auto |
| **Priority** | 10 |
| **Status** | Not Started |

### Record 2: TXT Record

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | send |
| **Value** | v=spf1 include:amazonses.com ~all |
| **TTL** | Auto |
| **Priority** | - |
| **Status** | Not Started |

---

## 3. DMARC (Optional but Recommended)

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | _dmarc |
| **Value** | v=DMARC1; p=none; |
| **TTL** | Auto |
| **Status** | Not Started |

---

## 4. Enable Receiving - MX (if needed)

Check Resend dashboard for MX records if you want to receive emails.

---

## Next Steps

1. Log in to GoDaddy DNS management for yassu.ai
2. Add each DNS record exactly as specified above
3. Wait 5-30 minutes for DNS propagation
4. Return to Resend and click "Verify DNS Records"
5. Once verified, emails will be sent successfully

---

## Important Notes

- DNS changes can take up to 48 hours to fully propagate, but usually complete within 5-30 minutes
- Make sure to copy the full DKIM value from the Resend dashboard (it's very long)
- The SPF record allows Amazon SES to send emails on behalf of yassu.ai
- DMARC helps prevent email spoofing and improves deliverability
