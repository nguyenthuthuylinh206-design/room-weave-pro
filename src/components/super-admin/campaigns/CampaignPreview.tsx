interface CampaignPreviewProps {
  subject: string;
  body: string;
}

export function CampaignPreview({ subject, body }: CampaignPreviewProps) {
  const previewBody = body
    .replace(/\{\{tenant_name\}\}/g, 'Acme Corp')
    .replace(/\{\{contact_name\}\}/g, 'John Doe')
    .replace(/\{\{plan_name\}\}/g, 'Premium Plan');

  return (
    <div className="border rounded-lg p-6 bg-background">
      <div className="space-y-4">
        <div className="border-b pb-4">
          <p className="text-xs text-muted-foreground mb-2">Subject:</p>
          <p className="font-semibold text-foreground">
            {subject || 'Your email subject will appear here...'}
          </p>
        </div>
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-foreground">
            {previewBody || 'Your email content will appear here...'}
          </div>
        </div>
      </div>
    </div>
  );
}
