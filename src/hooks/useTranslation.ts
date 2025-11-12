import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useMemo } from 'react';

export function useTranslation(namespace: string | string[] = 'common') {
  const { t, i18n } = useI18nTranslation(namespace);

  // Memoize common translations to avoid unnecessary re-renders
  const commonTranslations = useMemo(
    () => ({
      // Actions
      save: t('actions.save'),
      cancel: t('actions.cancel'),
      delete: t('actions.delete'),
      edit: t('actions.edit'),
      add: t('actions.add'),
      create: t('actions.create'),
      update: t('actions.update'),
      search: t('actions.search'),
      filter: t('actions.filter'),
      
      // Navigation
      dashboard: t('navigation.dashboard'),
      inventory: t('navigation.inventory'),
      items: t('navigation.items'),
      rooms: t('navigation.rooms'),
      laundry: t('navigation.laundry'),
      settings: t('navigation.settings'),
      
      // Status
      active: t('status.active'),
      inactive: t('status.inactive'),
      pending: t('status.pending'),
      completed: t('status.completed'),
      
      // Messages
      loading: t('messages.loading'),
      noData: t('messages.noData'),
      success: t('messages.success'),
      error: t('messages.error'),
    }),
    [t, i18n.language]
  );

  return {
    t,
    i18n,
    commonTranslations,
    currentLanguage: i18n.language,
  };
}
