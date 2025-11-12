import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lng: string) => Promise<void>;
  isChanging: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);

  // Sync language with backend when user logs in
  useEffect(() => {
    const syncLanguageWithBackend = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch language preference:', error);
          return;
        }

        const preferences = data?.preferences as any;
        if (preferences?.language && preferences.language !== i18n.language) {
          await i18n.changeLanguage(preferences.language);
        }
      } catch (error) {
        console.error('Failed to sync language:', error);
      }
    };

    syncLanguageWithBackend();
  }, [user?.id, i18n]);

  const changeLanguage = async (lng: string) => {
    setIsChanging(true);
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('preferredLanguage', lng);

      // Save to backend if user is logged in
      if (user?.id) {
        const { data: currentPrefs } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        const preferences = (currentPrefs?.preferences as any) || {};
        
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              preferences: { ...preferences, language: lng },
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            }
          );

        if (error) throw error;
      }

      toast({
        title: lng === 'vi' ? 'Đã đổi ngôn ngữ' : 'Language Changed',
        description: lng === 'vi' ? 'Ngôn ngữ hiển thị đã được cập nhật' : 'Display language has been updated',
      });
    } catch (error: any) {
      console.error('Failed to change language:', error);
      toast({
        title: 'Error',
        description: 'Failed to change language',
        variant: 'destructive',
      });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage: i18n.language,
        changeLanguage,
        isChanging,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
