import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import * as Icons from 'lucide-react';
import type { Announcement } from '@/types/announcement.types';
import { useDismissAnnouncement } from '@/hooks/announcements/useActiveAnnouncements';

interface Props {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementPopup({ announcement: a, open, onOpenChange }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const dismiss = useDismissAnnouncement();

  const Icon =
    (a.icon && (Icons as unknown as Record<string, Icons.LucideIcon>)[a.icon]) || Icons.Megaphone;

  const handleClose = () => {
    if (dontShowAgain && a.is_dismissible) {
      dismiss.mutate(a.id);
    }
    onOpenChange(false);
  };

  const handleCta = () => {
    if (a.cta_url) {
      if (a.cta_url.startsWith('http')) {
        window.open(a.cta_url, '_blank', 'noopener');
      } else {
        window.location.href = a.cta_url;
      }
    }
    handleClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <AlertDialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-7 w-7 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-lg sm:text-xl leading-tight">
            {a.title}
          </AlertDialogTitle>
          {a.body && (
            <AlertDialogDescription className="text-center text-sm text-muted-foreground whitespace-pre-line">
              {a.body}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {a.image_url && (
          <img
            src={a.image_url}
            alt={a.title}
            className="w-full rounded-md border max-h-60 object-cover"
          />
        )}

        <div className="flex flex-col gap-3 mt-2">
          {a.is_dismissible && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`dont-show-${a.id}`}
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(v === true)}
              />
              <label
                htmlFor={`dont-show-${a.id}`}
                className="text-xs text-muted-foreground cursor-pointer leading-none"
              >
                Không hiển thị lại
              </label>
            </div>
          )}
          {a.cta_url ? (
            <>
              <AlertDialogAction onClick={handleCta} className="w-full">
                {a.cta_label || 'Xem chi tiết'}
              </AlertDialogAction>
              <AlertDialogCancel onClick={handleClose} className="w-full mt-0">
                Để sau
              </AlertDialogCancel>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              {a.cta_label || 'Đã hiểu'}
            </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
