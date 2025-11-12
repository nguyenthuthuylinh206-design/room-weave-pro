import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const abTestSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  variantASubject: z.string().min(5, 'Subject must be at least 5 characters'),
  variantBSubject: z.string().min(5, 'Subject must be at least 5 characters'),
  sampleSize: z.number().min(100).max(10000),
});

type ABTestFormValues = z.infer<typeof abTestSchema>;

interface CreateABTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateABTestDialog({ open, onOpenChange }: CreateABTestDialogProps) {
  const { toast } = useToast();

  const form = useForm<ABTestFormValues>({
    resolver: zodResolver(abTestSchema),
    defaultValues: {
      name: '',
      variantASubject: '',
      variantBSubject: '',
      sampleSize: 1000,
    },
  });

  const onSubmit = async (data: ABTestFormValues) => {
    console.log('Creating A/B test:', data);
    toast({
      title: 'A/B Test Created',
      description: 'Your A/B test has been created and will start soon.',
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Subject line test for welcome email" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this A/B test
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Variant A</h3>
              <FormField
                control={form.control}
                name="variantASubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Welcome to our platform! 🎉"
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Variant B</h3>
              <FormField
                control={form.control}
                name="variantBSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Get started with your free trial"
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sampleSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sample Size per Variant</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="100"
                      max="10000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of recipients for each variant (100-10,000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Test
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
