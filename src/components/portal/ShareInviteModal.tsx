import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Copy, Mail, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import { SiX, SiLinkedin, SiWhatsapp } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: 'general' | 'idea';
  ideaTitle?: string;
  ideaId?: string;
}

export function ShareInviteModal({ open, onOpenChange, context = 'general', ideaTitle, ideaId }: ShareInviteModalProps) {
  const { toast } = useToast();
  const brand = useBranding();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const shareUrl = brand.canonicalUrl;

  const userName = user?.fullName || 'A friend';

  const shareText = context === 'idea' && ideaTitle
    ? `Check out "${ideaTitle}" on ${brand.name}! Join the community where university founders turn ideas into startups.`
    : `I'm building my startup on ${brand.name}! Join me and turn your ideas into real businesses with AI-powered tools, team matching, and mentorship.`;

  const shareTitle = context === 'idea' && ideaTitle
    ? `${ideaTitle} — ${brand.name}`
    : `Join ${brand.name} — Where University Founders Build`;

  const emailSubject = context === 'idea' && ideaTitle
    ? `Check out this startup idea on ${brand.name}`
    : `${userName} invited you to ${brand.name}`;

  const emailBody = `${shareText}\n\n${shareUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast({ title: 'Copied to clipboard', description: 'Share link and message copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const handleXShare = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    if (showEmailForm && emailTo) {
      const subject = encodeURIComponent(emailSubject);
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, '_self');
      setShowEmailForm(false);
      setEmailTo('');
      toast({ title: 'Opening email', description: 'Your email app should open now.' });
    } else if (showEmailForm) {
      const subject = encodeURIComponent(emailSubject);
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
      setShowEmailForm(false);
    } else {
      setShowEmailForm(true);
    }
  };

  const socialButtons = [
    {
      label: 'X (Twitter)',
      icon: SiX,
      onClick: handleXShare,
      className: 'bg-black hover:bg-black/80 text-white',
    },
    {
      label: 'LinkedIn',
      icon: SiLinkedin,
      onClick: handleLinkedIn,
      className: 'bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white',
    },
    {
      label: 'WhatsApp',
      icon: SiWhatsapp,
      onClick: handleWhatsApp,
      className: 'bg-[#25D366] hover:bg-[#25D366]/80 text-white',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="share-invite-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {context === 'idea' ? 'Share This Idea' : 'Invite Friends'}
          </DialogTitle>
          <DialogDescription>
            {context === 'idea' 
              ? 'Share this startup idea with your network.'
              : 'Spread the word and invite friends to build on ' + brand.name + '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm leading-relaxed">{shareText}</p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {shareUrl}
            </p>
          </div>

          {navigator.share && (
            <Button 
              onClick={handleNativeShare} 
              className="w-full gap-2"
              size="lg"
              data-testid="button-native-share"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}

          <div className="grid grid-cols-3 gap-2">
            {socialButtons.map((btn) => (
              <Button
                key={btn.label}
                onClick={btn.onClick}
                className={`gap-2 ${btn.className}`}
                size="sm"
                data-testid={`button-share-${btn.label.toLowerCase().replace(/[^a-z]/g, '')}`}
              >
                <btn.icon className="h-4 w-4" />
                <span className="text-xs">{btn.label}</span>
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 gap-2"
              data-testid="button-copy-share-link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              className="flex-1 gap-2"
              data-testid="button-email-invite"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>

          <AnimatePresence>
            {showEmailForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-1">
                  <Input
                    type="email"
                    placeholder="friend@email.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    data-testid="input-email-invite"
                    onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                  />
                  <Button onClick={handleEmail} size="sm" data-testid="button-send-email">
                    Send
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Textarea
            value={`${shareText}\n${shareUrl}`}
            readOnly
            rows={3}
            className="text-xs resize-none"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            data-testid="textarea-share-message"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
