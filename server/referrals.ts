import { db } from './db';
import { sql } from 'drizzle-orm';

export interface Referral {
  id: string;
  userId: number;
  platform: string;
  ideaId: string;
  ideaTitle: string;
  clickedAt: Date;
  convertedAt: Date | null;
  conversionValue: number | null;
  status: 'pending' | 'converted' | 'expired';
}

// Create referrals table if it doesn't exist
export async function initReferralsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      idea_id UUID NOT NULL,
      idea_title TEXT NOT NULL,
      clicked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      converted_at TIMESTAMP,
      conversion_value DECIMAL(10, 2),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_referrals_platform ON referrals(platform)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status)
  `);
}

// Track a new referral click
export async function trackReferral(
  userId: number,
  platform: string,
  ideaId: string,
  ideaTitle: string
): Promise<Referral> {
  const result = await db.execute(sql`
    INSERT INTO referrals (user_id, platform, idea_id, idea_title, status)
    VALUES (${userId}, ${platform}, ${ideaId}, ${ideaTitle}, 'pending')
    RETURNING *
  `);

  return result.rows[0] as Referral;
}

// Get all referrals for a user
export async function getUserReferrals(userId: number): Promise<Referral[]> {
  const result = await db.execute(sql`
    SELECT * FROM referrals
    WHERE user_id = ${userId}
    ORDER BY clicked_at DESC
  `);

  return result.rows as Referral[];
}

// Get referral stats for a user
export async function getUserReferralStats(userId: number) {
  const result = await db.execute(sql`
    SELECT
      platform,
      COUNT(*) as total_clicks,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions,
      COALESCE(SUM(conversion_value), 0) as total_value,
      ROUND(
        COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / 
        NULLIF(COUNT(*)::numeric, 0) * 100,
        2
      ) as conversion_rate
    FROM referrals
    WHERE user_id = ${userId}
    GROUP BY platform
  `);

  return result.rows;
}

// Get all referrals (admin only)
export async function getAllReferrals(): Promise<Referral[]> {
  const result = await db.execute(sql`
    SELECT 
      r.*,
      u.email as user_email,
      u.full_name as user_name
    FROM referrals r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.clicked_at DESC
  `);

  return result.rows as any[];
}

// Mark a referral as converted (for when Manus notifies us)
export async function markReferralConverted(
  referralId: string,
  conversionValue: number
): Promise<void> {
  await db.execute(sql`
    UPDATE referrals
    SET 
      status = 'converted',
      converted_at = NOW(),
      conversion_value = ${conversionValue},
      updated_at = NOW()
    WHERE id = ${referralId}
  `);
}
