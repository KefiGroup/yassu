import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ExternalLink, DollarSign, Users, BarChart3 } from "lucide-react";

interface Referral {
  id: string;
  userId: number;
  platform: string;
  ideaId: string | null;
  ideaTitle: string | null;
  referralCode: string;
  status: string;
  clickedAt: string;
  convertedAt: string | null;
  estimatedRevenue: number;
}

interface ReferralStats {
  totalClicks: number;
  totalConversions: number;
  estimatedRevenue: number;
  conversionRate: number;
  platformBreakdown: {
    platform: string;
    clicks: number;
    conversions: number;
  }[];
}

export default function ReferralDashboard() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const [referralsRes, statsRes] = await Promise.all([
        fetch("/api/referrals/mine"),
        fetch("/api/referrals/stats")
      ]);

      if (referralsRes.ok && statsRes.ok) {
        const referralsData = await referralsRes.json();
        const statsData = await statsRes.json();
        setReferrals(referralsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Referral Dashboard</h1>
        <p className="text-gray-600">
          Track your Manus AI referrals and estimated earnings from Yassu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Students clicked "Build MVP"
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Students subscribed to Manus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Click to subscription rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.estimatedRevenue.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending partnership agreement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      {stats && stats.platformBreakdown && stats.platformBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Platform Breakdown
            </CardTitle>
            <CardDescription>
              Referral performance by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.platformBreakdown.map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {platform.platform}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {platform.clicks} clicks
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {platform.conversions} conversions
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>
            All your Manus AI referrals from Yassu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ExternalLink className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your ideas and encourage students to build MVPs!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">
                        {referral.platform}
                      </Badge>
                      <Badge
                        variant={referral.status === "converted" ? "default" : "secondary"}
                      >
                        {referral.status}
                      </Badge>
                    </div>
                    <p className="font-medium">
                      {referral.ideaTitle || "Untitled Idea"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Clicked: {new Date(referral.clickedAt).toLocaleDateString()}
                    </p>
                    {referral.convertedAt && (
                      <p className="text-sm text-green-600">
                        Converted: {new Date(referral.convertedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Referral Code</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {referral.referralCode}
                    </code>
                    {referral.status === "converted" && (
                      <p className="text-sm font-medium text-green-600 mt-2">
                        +${referral.estimatedRevenue.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">About Referral Tracking</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ul className="space-y-2 text-sm">
            <li>• Each "Build MVP with Manus AI" click is tracked with a unique referral code</li>
            <li>• Estimated revenue assumes 20% commission on Manus subscriptions ($20/month)</li>
            <li>• Conversion tracking will be enabled once partnership with Manus is established</li>
            <li>• This data will be used to demonstrate value in partnership negotiations</li>
            <li>• All revenue goes toward keeping Yassu 100% free for students</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
