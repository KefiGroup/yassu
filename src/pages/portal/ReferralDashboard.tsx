export default function ReferralDashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Referral Dashboard</h1>
      <p className="text-gray-600">Track all Yassu → Manus AI referrals platform-wide</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
          <p className="text-3xl font-bold mt-2">0%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Est. Revenue</h3>
          <p className="text-3xl font-bold mt-2">$0.00</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Referral History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No referrals tracked yet</p>
          <p className="text-sm mt-2">When any student clicks "Build MVP with Manus AI", all referrals will appear here</p>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">About Referral Tracking</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each "Build MVP with Manus AI" click is tracked with a unique referral code</li>
          <li>• Estimated revenue assumes 20% commission on Manus subscriptions ($20/month)</li>
          <li>• This data demonstrates value for partnership negotiations with Manus</li>
          <li>• All revenue goes toward keeping Yassu 100% free for students</li>
          <li>• Admin-only view: participants cannot see this dashboard</li>
        </ul>
      </div>
    </div>
  );
}
