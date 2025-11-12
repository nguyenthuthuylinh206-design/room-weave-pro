import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TemplateEditorProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateEditor({ template, open, onOpenChange }: TemplateEditorProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: template || {
      name: '',
      subject: '',
      content: '',
    },
  });

  const onSubmit = (data: any) => {
    console.log('Save template:', data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input {...register('name')} placeholder="e.g., 7 Days Before Expiry" />
          </div>

          <div>
            <Label>Email Subject</Label>
            <Input {...register('subject')} placeholder="Use {{variables}} for dynamic content" />
          </div>

          <div>
            <Label>Email Content</Label>
            <Textarea
              {...register('content')}
              rows={15}
              placeholder="Write your email content here. Use {{variables}} for dynamic content."
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
