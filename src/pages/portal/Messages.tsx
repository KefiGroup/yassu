import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageSquare, Construction } from 'lucide-react';

export default function Messages() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your teammates and collaborators
        </p>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Direct messaging and team chat features are under development. For now, use project
              comments to communicate with your team.
            </p>
            <Button variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              View Project Comments
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
