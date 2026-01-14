import { motion } from 'framer-motion';
import { BookOpen, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Resources() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">University Resources</h1>
        <p className="text-muted-foreground">
          Discover incubators, labs, grants, and other resources at your university
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-center py-16"
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
              <p className="text-muted-foreground text-sm">
                We're building a comprehensive directory of university resources including incubators, labs, grants, and alumni programs to help you on your entrepreneurship journey.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <BookOpen className="w-4 h-4" />
              <span>Stay tuned for updates</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
