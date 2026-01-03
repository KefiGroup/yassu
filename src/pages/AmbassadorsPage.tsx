import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ArrowRight, Linkedin, Star, Users, Rocket } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Profile {
  id: number;
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  major: string | null;
  graduationYear: number | null;
  skills: string[] | null;
  linkedinUrl: string | null;
  universityId: string | null;
  otherUniversity: string | null;
}

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAmbassadors() {
      try {
        const data = await api.ambassadors.list();
        if (Array.isArray(data)) {
          setAmbassadors(data);
        } else {
          setAmbassadors([]);
        }
      } catch (error) {
        console.error('Failed to fetch ambassadors:', error);
        setAmbassadors([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAmbassadors();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Yassu <span className="text-gradient">Ambassadors</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Student leaders who are building the future of university entrepreneurship.
              Our ambassadors represent Yassu on campus and help fellow students launch their ventures.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Lead Your Campus</h3>
              <p className="text-muted-foreground">Represent Yassu at your university and help fellow students launch their ventures.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Build Your Network</h3>
              <p className="text-muted-foreground">Connect with ambitious founders and builders across the national Yassu network.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center mx-auto mb-6">
                <Rocket className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Shape the Future</h3>
              <p className="text-muted-foreground">Help define how the next generation of companies are built, before capital decides who matters.</p>
            </motion.div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : ambassadors.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-lg mb-6" data-testid="text-empty-ambassadors">
                No ambassadors have joined yet. Be the first to become a Yassu Ambassador!
              </p>
              <Button variant="hero" size="lg" asChild data-testid="button-become-ambassador-empty">
                <a href="/portal" data-testid="link-become-ambassador-empty">
                  Become an Ambassador
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ambassadors.map((ambassador, index) => (
                <motion.div
                  key={ambassador.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Card className="h-full" data-testid={`card-ambassador-${ambassador.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={ambassador.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(ambassador.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{ambassador.fullName || 'Anonymous'}</h3>
                          {ambassador.major && (
                            <p className="text-sm text-muted-foreground">{ambassador.major}</p>
                          )}
                          {ambassador.graduationYear && (
                            <p className="text-xs text-muted-foreground">Class of {ambassador.graduationYear}</p>
                          )}
                        </div>
                      </div>
                      
                      {ambassador.bio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{ambassador.bio}</p>
                      )}
                      
                      {ambassador.skills && ambassador.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {ambassador.skills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {ambassador.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{ambassador.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {ambassador.linkedinUrl && (
                        <Button variant="outline" size="sm" asChild className="w-full" data-testid={`button-linkedin-ambassador-${ambassador.id}`}>
                          <a href={ambassador.linkedinUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-linkedin-ambassador-${ambassador.id}`}>
                            <Linkedin className="w-4 h-4 mr-2" />
                            Connect on LinkedIn
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mt-16"
          >
            <h2 className="text-2xl font-bold mb-4 text-foreground">Want to become an Ambassador?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Lead your campus community and help fellow students turn their ideas into reality.
              Join the movement that's changing how university companies are built.
            </p>
            <Button variant="hero" size="xl" asChild className="group" data-testid="button-become-ambassador">
              <a href="/portal" data-testid="link-become-ambassador">
                Become an Ambassador
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
