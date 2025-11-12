import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Copy } from 'lucide-react';
import { TemplateEditor } from './TemplateEditor';
import { TemplatePreview } from './TemplatePreview';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  content: string;
  variables: string[];
  lastUpdated: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: '7 Days Before Expiry',
    subject: 'Your subscription expires in 7 days - {{tenant_name}}',
    category: 'renewal',
    content: `Hi {{contact_name}}, Your {{plan_name}} subscription will expire in 7 days on {{expiry_date}}.`,
    variables: ['tenant_name', 'contact_name', 'plan_name', 'expiry_date', 'renewal_link'],
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    name: '3 Days Urgent Reminder',
    subject: 'URGENT: Your subscription expires in 3 days - {{tenant_name}}',
    category: 'renewal',
    content: `URGENT: Your {{plan_name}} subscription will expire in just 3 days on {{expiry_date}}.`,
    variables: ['tenant_name', 'contact_name', 'plan_name', 'expiry_date', 'renewal_link'],
    lastUpdated: '2024-01-15',
  },
  {
    id: '3',
    name: '1 Day Final Notice',
    subject: 'FINAL NOTICE: Your subscription expires tomorrow - {{tenant_name}}',
    category: 'renewal',
    content: `FINAL NOTICE: Your {{plan_name}} subscription expires TOMORROW ({{expiry_date}}).`,
    variables: ['tenant_name', 'contact_name', 'plan_name', 'expiry_date', 'renewal_link'],
    lastUpdated: '2024-01-15',
  },
  {
    id: '4',
    name: 'Grace Period - Payment Failed',
    subject: 'Payment Failed - Action Required - {{tenant_name}}',
    category: 'payment',
    content: `We attempted to process your subscription renewal payment but it failed.`,
    variables: ['tenant_name', 'contact_name', 'grace_period_end', 'payment_update_link'],
    lastUpdated: '2024-01-15',
  },
];

export function ReminderTemplates() {
  const [templates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Manage email templates for renewal reminders</p>
        </div>
        <Button onClick={() => {
          setSelectedTemplate(null);
          setEditorOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplatesList
            templates={templates}
            onPreview={(template) => {
              setSelectedTemplate(template);
              setPreviewOpen(true);
            }}
            onEdit={(template) => {
              setSelectedTemplate(template);
              setEditorOpen(true);
            }}
          />
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <TemplatesList
              templates={templates.filter(t => t.category === category)}
              onPreview={(template) => {
                setSelectedTemplate(template);
                setPreviewOpen(true);
              }}
              onEdit={(template) => {
                setSelectedTemplate(template);
                setEditorOpen(true);
              }}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <TemplateEditor
        template={selectedTemplate}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
      <TemplatePreview
        template={selectedTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

function TemplatesList({ templates, onPreview, onEdit }: any) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template: EmailTemplate) => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary" className="mt-2 capitalize">
                  {template.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Subject:</p>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {template.subject}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 3).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                  {template.variables.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.variables.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onPreview(template)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onEdit(template)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Last updated: {template.lastUpdated}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
