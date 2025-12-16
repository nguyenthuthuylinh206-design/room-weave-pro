import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  FileText,
  Tag,
  Mail,
} from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation('superAdmin');

  const actions = [
    {
      label: t('quickActions.createPromoCode'),
      icon: Tag,
      onClick: () => navigate('/super-admin/promo-codes'),
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      label: t('quickActions.newCampaign'),
      icon: Mail,
      onClick: () => navigate('/super-admin/campaigns/new'),
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: t('quickActions.scheduleReminders'),
      icon: RefreshCw,
      onClick: () => navigate('/super-admin/reminders'),
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      label: t('quickActions.generateReport'),
      icon: FileText,
      onClick: () => {
        console.log('Generate report');
      },
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('quickActions.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            className={`w-full justify-start ${action.color} text-white`}
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
