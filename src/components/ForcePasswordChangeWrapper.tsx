import { useAuth } from '@/contexts/AuthContext';
import { ForcePasswordChange } from '@/components/ForcePasswordChange';

export function ForcePasswordChangeWrapper() {
  const { user, loading } = useAuth();

  if (loading || !user || !user.mustChangePassword) {
    return null;
  }

  const handleSuccess = () => {
    window.location.reload();
  };

  return <ForcePasswordChange open={true} onSuccess={handleSuccess} />;
}
