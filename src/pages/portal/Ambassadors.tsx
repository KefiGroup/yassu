import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { ConnectionButton } from '@/components/ConnectionButton';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: number;
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  skills: string[] | null;
  universityId: string | null;
  university?: { name: string; shortName: string | null } | null;
}

export default function Ambassadors() {
  const [ambassadors, setAmbassadors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch('/api/ambassadors', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setAmbassadors(data);
        setLoading(false);
      });
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Yassu Ambassadors</h1>
        <p className="text-muted-foreground">
          Connect with undergrad students who represent Yassu on their campus
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ambassadors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ambassadors.map((ambassador, index) => (
            <motion.div
              key={ambassador.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <Card className="h-full" data-testid={`card-ambassador-${ambassador.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={ambassador.avatarUrl || undefined} alt={ambassador.fullName || 'Ambassador'} />
                      <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm font-medium">
                        {getInitials(ambassador.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{ambassador.fullName || 'Anonymous'}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          Ambassador
                        </Badge>
                        {ambassador.university?.shortName && (
                          <Badge variant="secondary" className="text-xs">
                            {ambassador.university.shortName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ambassador.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ambassador.bio}
                    </p>
                  )}
                  {ambassador.skills && ambassador.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ambassador.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {ambassador.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{ambassador.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <ConnectionButton
                    targetUserId={ambassador.userId}
                    currentUserId={user?.id}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-16"
        >
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No ambassadors found</h3>
          <p className="text-muted-foreground">
            Check back later for new ambassadors
          </p>
        </motion.div>
      )}
    </div>
  );
}
