import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Authentication hook specifically for Super Admin routes
 * Redirects non-super-admin users to home page
 */
export function useSuperAdminAuth() {
  const { user, loading, signOut: authSignOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      // Check if user is logged in
      if (!user) {
        toast({
          title: 'Yêu cầu đăng nhập',
          description: 'Vui lòng đăng nhập để truy cập cổng quản trị.',
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
          title: 'Truy cập bị từ chối',
          description: 'Bạn không có quyền truy cập cổng quản trị viên cấp cao.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
    }
  }, [user, loading, navigate, toast]);

  const signOut = useCallback(async () => {
    await authSignOut();
    navigate('/auth/login');
  }, [authSignOut, navigate]);

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
