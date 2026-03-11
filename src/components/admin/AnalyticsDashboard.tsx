import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, Lightbulb, UsersRound, FileText, Presentation, Link2, MessageSquare, TrendingUp, TrendingDown, ArrowUpRight, X, Building2, UserCheck, Handshake, MailPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AnalyticsData {
  kpis: {
    totalUsers: number;
    usersLast7Days: number;
    usersLast30Days: number;
    totalIdeas: number;
    publicIdeas: number;
    privateIdeas: number;
    totalTeams: number;
    totalTeamMembers: number;
    businessPlansGenerated: number;
    pitchDecksGenerated: number;
    totalConnections: number;
    acceptedConnections: number;
    pendingConnections: number;
    totalMessages: number;
    joinRequests: { total: number; pending: number; accepted: number };
    teamInvites: { total: number; pending: number; accepted: number };
  };
  ideaStages: { stage: string; count: number }[];
  brandBreakdown: { brand: string; count: number }[];
  userGrowth: { week: string; count: number }[];
  ideaGrowth: { week: string; count: number }[];
  teamGrowth: { week: string; count: number }[];
  usersByUniversity: { university: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  recentUsers: any[];
  recentIdeas: any[];
  recentTeams: any[];
}

interface DrilldownData {
  data: any[];
}

const STAGE_LABELS: Record<string, string> = {
  idea_posted: 'Idea Posted',
  business_plan: 'Business Plan',
  find_advisors: 'Find Advisors',
  form_team: 'Form Team',
  build_mvp: 'Build MVP',
  yassu_foundry: 'Foundry',
  launched: 'Launched',
  unknown: 'Unknown',
};

const CHART_COLORS = [
  'hsl(250, 60%, 65%)',
  'hsl(15, 80%, 75%)',
  'hsl(213, 69%, 38%)',
  'hsl(45, 100%, 51%)',
  'hsl(160, 60%, 45%)',
  'hsl(340, 70%, 55%)',
  'hsl(280, 60%, 60%)',
  'hsl(30, 80%, 55%)',
];

const FUNNEL_COLORS = [
  'hsl(250, 60%, 65%)',
  'hsl(213, 69%, 50%)',
  'hsl(190, 60%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(45, 90%, 50%)',
  'hsl(30, 80%, 55%)',
  'hsl(15, 80%, 60%)',
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWeek(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownData, setDrilldownData] = useState<any[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState(false);
  const [drilldownColumns, setDrilldownColumns] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const result = await apiRequest<AnalyticsData>('/admin/analytics');
      setData(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openDrilldown(category: string, title: string, columns: { key: string; label: string }[], filter?: string) {
    setDrilldownTitle(title);
    setDrilldownColumns(columns);
    setDrilldownOpen(true);
    setDrilldownLoading(true);
    setDrilldownError(false);
    try {
      const params = new URLSearchParams({ category });
      if (filter) params.set('filter', filter);
      const result = await apiRequest<DrilldownData>(`/admin/analytics/drilldown?${params.toString()}`);
      setDrilldownData(result.data);
    } catch (error) {
      console.error('Failed to fetch drilldown:', error);
      setDrilldownData([]);
      setDrilldownError(true);
    } finally {
      setDrilldownLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Users',
      value: data.kpis.totalUsers,
      subtitle: `+${data.kpis.usersLast7Days} this week`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      onClick: () => openDrilldown('users', 'All Registered Users', [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'university_name', label: 'University' },
        { key: 'created_at', label: 'Joined' },
      ]),
    },
    {
      title: 'Ideas Posted',
      value: data.kpis.totalIdeas,
      subtitle: `${data.kpis.publicIdeas} public · ${data.kpis.privateIdeas} private`,
      icon: Lightbulb,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      onClick: () => openDrilldown('ideas', 'All Ideas', [
        { key: 'title', label: 'Title' },
        { key: 'creator_name', label: 'Creator' },
        { key: 'stage', label: 'Stage' },
        { key: 'brand', label: 'Brand' },
        { key: 'created_at', label: 'Created' },
      ]),
    },
    {
      title: 'Teams Formed',
      value: data.kpis.totalTeams,
      subtitle: `${data.kpis.totalTeamMembers} total members`,
      icon: UsersRound,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      onClick: () => openDrilldown('teams', 'All Teams', [
        { key: 'name', label: 'Team Name' },
        { key: 'creator_name', label: 'Created By' },
        { key: 'member_count', label: 'Members' },
        { key: 'created_at', label: 'Created' },
      ]),
    },
    {
      title: 'Business Plans',
      value: data.kpis.businessPlansGenerated,
      subtitle: 'AI-generated plans',
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      onClick: () => openDrilldown('business_plans', 'Business Plans Generated', [
        { key: 'idea_title', label: 'Idea' },
        { key: 'user_name', label: 'User' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created' },
      ]),
    },
    {
      title: 'Pitch Decks',
      value: data.kpis.pitchDecksGenerated,
      subtitle: 'Investor decks created',
      icon: Presentation,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      onClick: () => openDrilldown('pitch_decks', 'Pitch Decks Generated', [
        { key: 'idea_title', label: 'Idea' },
        { key: 'investor_mode', label: 'Type' },
        { key: 'deck_type', label: 'Deck' },
        { key: 'target_raise', label: 'Target Raise' },
        { key: 'created_at', label: 'Created' },
      ]),
    },
    {
      title: 'Connections',
      value: data.kpis.totalConnections,
      subtitle: `${data.kpis.acceptedConnections} accepted · ${data.kpis.pendingConnections} pending`,
      icon: Handshake,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      onClick: () => openDrilldown('connections', 'All Connections', [
        { key: 'from_user', label: 'From' },
        { key: 'to_user', label: 'To' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Date' },
      ]),
    },
    {
      title: 'Messages Sent',
      value: data.kpis.totalMessages,
      subtitle: 'Direct messages exchanged',
      icon: MessageSquare,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      onClick: () => openDrilldown('messages', 'Recent Messages', [
        { key: 'from_user', label: 'From' },
        { key: 'to_user', label: 'To' },
        { key: 'preview', label: 'Message' },
        { key: 'created_at', label: 'Sent' },
      ]),
    },
    {
      title: 'Join Requests',
      value: data.kpis.joinRequests.total,
      subtitle: `${data.kpis.joinRequests.accepted} accepted · ${data.kpis.joinRequests.pending} pending`,
      icon: MailPlus,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      onClick: () => openDrilldown('join_requests', 'Join Requests', [
        { key: 'user_name', label: 'User' },
        { key: 'idea_title', label: 'Idea' },
        { key: 'status', label: 'Status' },
        { key: 'interest_type', label: 'Type' },
        { key: 'created_at', label: 'Date' },
      ]),
    },
  ];

  const growthData = (() => {
    const weekMap = new Map<string, { users: number; ideas: number; teams: number }>();
    const allWeeks = new Set<string>();
    data.userGrowth.forEach(d => allWeeks.add(d.week));
    data.ideaGrowth.forEach(d => allWeeks.add(d.week));
    data.teamGrowth.forEach(d => allWeeks.add(d.week));
    allWeeks.forEach(w => weekMap.set(w, { users: 0, ideas: 0, teams: 0 }));
    data.userGrowth.forEach(d => { const e = weekMap.get(d.week)!; e.users = d.count; });
    data.ideaGrowth.forEach(d => { const e = weekMap.get(d.week)!; e.ideas = d.count; });
    data.teamGrowth.forEach(d => { const e = weekMap.get(d.week)!; e.teams = d.count; });
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([week, counts]) => ({ week: formatWeek(week), ...counts }));
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-analytics-title">Platform Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">Real-time metrics across the entire platform</p>
        </div>
        <Button variant="outline" onClick={fetchAnalytics} data-testid="button-refresh-analytics">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={kpi.onClick}
              data-testid={`card-kpi-${kpi.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                <div className="text-2xl font-bold">{kpi.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</div>
                <div className="text-xs text-primary mt-1 font-medium">{kpi.title}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Growth Trends (12 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(250, 60%, 65%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(250, 60%, 65%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIdeas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(45, 100%, 51%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(45, 100%, 51%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTeams" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="users" name="Users" stroke="hsl(250, 60%, 65%)" fill="url(#colorUsers)" strokeWidth={2} />
                    <Area type="monotone" dataKey="ideas" name="Ideas" stroke="hsl(45, 100%, 51%)" fill="url(#colorIdeas)" strokeWidth={2} />
                    <Area type="monotone" dataKey="teams" name="Teams" stroke="hsl(160, 60%, 45%)" fill="url(#colorTeams)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('ideas', 'Ideas by Stage', [
            { key: 'title', label: 'Title' },
            { key: 'creator_name', label: 'Creator' },
            { key: 'stage', label: 'Stage' },
            { key: 'brand', label: 'Brand' },
            { key: 'created_at', label: 'Created' },
          ])} data-testid="card-idea-stages">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Idea Pipeline Funnel</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ideaStages} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => STAGE_LABELS[v] || v}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [value, 'Ideas']}
                      labelFormatter={(label) => STAGE_LABELS[label] || label}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {data.ideaStages.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('brand', 'Ideas by Brand', [
            { key: 'title', label: 'Title' },
            { key: 'creator_name', label: 'Creator' },
            { key: 'stage', label: 'Stage' },
            { key: 'brand', label: 'Brand' },
            { key: 'created_at', label: 'Created' },
          ])} data-testid="card-brand-breakdown">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Brand Breakdown</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.brandBreakdown}
                      dataKey="count"
                      nameKey="brand"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ brand, count }) => `${brand === 'yassu' ? 'Yassu' : 'Bruin'}: ${count}`}
                    >
                      {data.brandBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.brand === 'yassu' ? 'hsl(250, 60%, 65%)' : 'hsl(213, 69%, 38%)'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('university', 'Users by University', [
            { key: 'full_name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'university_name', label: 'University' },
            { key: 'created_at', label: 'Joined' },
          ])} data-testid="card-universities">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Top Universities</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.usersByUniversity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No university data yet</p>
                ) : (
                  data.usersByUniversity.slice(0, 5).map((u, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[140px]">{u.university}</span>
                      </div>
                      <Badge variant="secondary">{u.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('users', 'All Users by Role', [
            { key: 'full_name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'university_name', label: 'University' },
            { key: 'created_at', label: 'Joined' },
          ])} data-testid="card-user-roles">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">User Roles</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.usersByRole.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No role data yet</p>
                ) : (
                  data.usersByRole.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatRole(r.role)}</span>
                      </div>
                      <Badge variant="secondary">{r.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('users', 'All Users', [
            { key: 'full_name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'university_name', label: 'University' },
            { key: 'created_at', label: 'Joined' },
          ])} data-testid="card-recent-users">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Signups</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
                ) : (
                  data.recentUsers.slice(0, 5).map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{u.full_name || 'Unnamed'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('ideas', 'All Ideas', [
            { key: 'title', label: 'Title' },
            { key: 'creator_name', label: 'Creator' },
            { key: 'stage', label: 'Stage' },
            { key: 'brand', label: 'Brand' },
            { key: 'created_at', label: 'Created' },
          ])} data-testid="card-recent-ideas">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Ideas</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentIdeas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ideas yet</p>
                ) : (
                  data.recentIdeas.slice(0, 5).map((idea: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{idea.title}</div>
                        <div className="text-xs text-muted-foreground">{idea.creator_name}</div>
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">{STAGE_LABELS[idea.stage] || idea.stage}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <Card className="border-border/50 cursor-pointer" onClick={() => openDrilldown('teams', 'All Teams', [
            { key: 'name', label: 'Team Name' },
            { key: 'creator_name', label: 'Created By' },
            { key: 'member_count', label: 'Members' },
            { key: 'created_at', label: 'Created' },
          ])} data-testid="card-recent-teams">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Teams</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No teams yet</p>
                ) : (
                  data.recentTeams.slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.creator_name}</div>
                      </div>
                      <Badge variant="secondary">{t.member_count} members</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle data-testid="text-drilldown-title">{drilldownTitle}</DialogTitle>
          </DialogHeader>
          {drilldownLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading details...</span>
            </div>
          ) : drilldownError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <X className="w-8 h-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load data. Please try again.</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    {drilldownColumns.map((col) => (
                      <th key={col.key} className="text-left py-3 px-3 font-medium text-muted-foreground">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drilldownData.length === 0 ? (
                    <tr>
                      <td colSpan={drilldownColumns.length} className="text-center py-8 text-muted-foreground">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    drilldownData.map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        {drilldownColumns.map((col) => (
                          <td key={col.key} className="py-2.5 px-3">
                            {col.key === 'created_at' || col.key === 'joined' ? (
                              formatDate(row[col.key])
                            ) : col.key === 'stage' ? (
                              <Badge variant="outline">{STAGE_LABELS[row[col.key]] || row[col.key] || '—'}</Badge>
                            ) : col.key === 'status' ? (
                              <Badge variant={row[col.key] === 'accepted' ? 'default' : row[col.key] === 'pending' ? 'secondary' : 'outline'}>
                                {row[col.key] || '—'}
                              </Badge>
                            ) : col.key === 'brand' ? (
                              <Badge variant="outline">{row[col.key] === 'bruin' ? 'Bruin' : 'Yassu'}</Badge>
                            ) : col.key === 'is_public' ? (
                              row[col.key] ? 'Public' : 'Private'
                            ) : col.key === 'skills' && Array.isArray(row[col.key]) ? (
                              <div className="flex flex-wrap gap-1">{row[col.key].slice(0, 3).map((s: string, j: number) => (
                                <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                              ))}</div>
                            ) : (
                              <span className="truncate block max-w-[200px]">{row[col.key] ?? '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="text-xs text-muted-foreground text-center py-3">
                Showing {drilldownData.length} record{drilldownData.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
