import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export function GoogleAuthButton() {
  const {
    toast
  } = useToast();
  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google login error:', error);
      toast({
        title: 'Lỗi đăng nhập',
        description: error.message || 'Không thể đăng nhập với Google',
        variant: 'destructive'
      });
    }
  };
  return;
}