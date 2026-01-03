import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ArrowRight, Linkedin, Briefcase, GraduationCap, Users } from 'lucide-react';
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

export default function Advisors() {
  const [advisors, setAdvisors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdvisors() {
      try {
        const data = await api.advisors.list();
        if (Array.isArray(data)) {
          setAdvisors(data);
        } else {
          setAdvisors([]);
        }
      } catch (error) {
        console.error('Failed to fetch advisors:', error);
        setAdvisors([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAdvisors();
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Yassu <span className="text-gradient">Advisors</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experienced professionals who mentor the next generation of university founders.
              Our advisors bring industry expertise, startup experience, and a passion for helping students succeed.
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
                <Briefcase className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Industry Expertise</h3>
              <p className="text-muted-foreground">Advisors bring real-world experience from top companies and successful startups.</p>
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
              <h3 className="text-xl font-semibold mb-3 text-foreground">1-on-1 Mentorship</h3>
              <p className="text-muted-foreground">Get personalized guidance to navigate challenges and accelerate your startup journey.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Alumni Network</h3>
              <p className="text-muted-foreground">Connect with graduates who understand the university founder journey firsthand.</p>
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
          ) : advisors.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-lg mb-6" data-testid="text-empty-advisors">
                No advisors have joined yet. Be the first to become a Yassu Advisor!
              </p>
              <Button variant="hero" size="lg" asChild data-testid="button-become-advisor-empty">
                <a href="/portal" data-testid="link-become-advisor-empty">
                  Become an Advisor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advisors.map((advisor, index) => (
                <motion.div
                  key={advisor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Card className="h-full" data-testid={`card-advisor-${advisor.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={advisor.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(advisor.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{advisor.fullName || 'Anonymous'}</h3>
                          {advisor.major && (
                            <p className="text-sm text-muted-foreground">{advisor.major}</p>
                          )}
                        </div>
                      </div>
                      
                      {advisor.bio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{advisor.bio}</p>
                      )}
                      
                      {advisor.skills && advisor.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {advisor.skills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {advisor.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{advisor.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {advisor.linkedinUrl && (
                        <Button variant="outline" size="sm" asChild className="w-full" data-testid={`button-linkedin-advisor-${advisor.id}`}>
                          <a href={advisor.linkedinUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-linkedin-advisor-${advisor.id}`}>
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
            <h2 className="text-2xl font-bold mb-4 text-foreground">Want to become an Advisor?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Share your expertise and help shape the next generation of founders. 
              Join our network of mentors making a difference.
            </p>
            <Button variant="hero" size="xl" asChild className="group" data-testid="button-apply-advisor">
              <a href="/portal" data-testid="link-apply-advisor">
                Apply to be an Advisor
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
