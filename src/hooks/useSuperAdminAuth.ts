import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Authentication hook specifically for Super Admin routes
 * Redirects non-super-admin users to home page
 */
export function useSuperAdminAuth() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      // Check if user is logged in
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to access Super Admin portal.',
          variant: 'destructive',
        });
        navigate('/auth/login');
        return;
      }

      // Check if user is super admin (check user_level_code or roles)
      const isSuperAdmin = (user as any).user_level_code === 'super_admin' || 
                          (user as any).is_super_admin === true;
      
      if (!isSuperAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access Super Admin portal.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
    }
  }, [user, loading, navigate, toast]);

  const isSuperAdmin = user ? 
    ((user as any).user_level_code === 'super_admin' || (user as any).is_super_admin === true) : 
    false;

  return { 
    user, 
    isLoading: loading,
    signOut,
    isSuperAdmin,
  };
}
