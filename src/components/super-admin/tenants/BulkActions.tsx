import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  XCircle, 
  PlayCircle, 
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface BulkActionsProps {
  selectedTenants: string[];
  onClearSelection: () => void;
}

export function BulkActions({ selectedTenants, onClearSelection }: BulkActionsProps) {
  const { toast } = useToast();

  const handleSendEmail = () => {
    toast({
      title: 'Emails Sent',
      description: `Sent emails to ${selectedTenants.length} tenants`,
    });
  };

  const handleSuspend = () => {
    toast({
      title: 'Tenants Suspended',
      description: `${selectedTenants.length} tenants have been suspended`,
    });
    onClearSelection();
  };

  const handleReactivate = () => {
    toast({
      title: 'Tenants Reactivated',
      description: `${selectedTenants.length} tenants have been reactivated`,
    });
    onClearSelection();
  };

  const handleDelete = () => {
    toast({
      title: 'Tenants Deleted',
      description: `${selectedTenants.length} tenants have been deleted`,
      variant: 'destructive',
    });
    onClearSelection();
  };

  return (
    <Card className="border-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {selectedTenants.length} Selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Suspend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend Tenants</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to suspend {selectedTenants.length} tenant(s)? 
                    They will lose access to their accounts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSuspend}>
                    Suspend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReactivate}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Reactivate
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Tenants</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete {selectedTenants.length} tenant(s)? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
