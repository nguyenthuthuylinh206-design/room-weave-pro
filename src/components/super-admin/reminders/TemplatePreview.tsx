import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';

interface TemplatePreviewProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePreview({ template, open, onOpenChange }: TemplatePreviewProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{template.name} - Preview</DialogTitle>
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject Line */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Subject Line:</p>
            <p className="font-medium">{template.subject}</p>
          </div>

          {/* Email Preview */}
          <div className="border rounded-lg p-6 bg-background">
            <div className="prose prose-sm max-w-none">
              <p>{template.content}</p>
            </div>
          </div>

          {/* Template Variables */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Available Variables:
            </p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((variable: string) => (
                <Badge key={variable} variant="outline" className="bg-background">
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
