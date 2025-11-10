import { Card } from '@/components/ui/card'
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone,
  Book,
  Video,
  FileText,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function HelpPage() {
  const faqs = [
    {
      question: 'How do I add a new item to inventory?',
      answer: 'Go to Items page, click "Add Item", fill in the details including name, code, category, and minimum stock level, then save.'
    },
    {
      question: 'How do I send items to laundry?',
      answer: 'Navigate to Laundry section, click "New Batch", select vendor, add items with quantities, and submit.'
    },
    {
      question: 'How can I generate reports?',
      answer: 'Visit the Reports page, select report type (Inventory, Laundry, or Financial), choose date range, and click Generate Report.'
    },
    {
      question: 'How do I manage multiple hotels?',
      answer: 'Use the hotel switcher in the top navigation. You can add new hotels in Settings > Hotels Management.'
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Help & Support</h1>
              <p className="text-sm text-muted-foreground">
                We're here to help
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Live Chat</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Email Us</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Phone className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Call Support</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Book className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">User Guide</span>
            </div>
          </Card>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Resources</h2>
          <Card>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors">
              <Video className="h-5 w-5 text-primary" />
              <span className="flex-1">Video Tutorials</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-t">
              <FileText className="h-5 w-5 text-primary" />
              <span className="flex-1">Documentation</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-t">
              <Book className="h-5 w-5 text-primary" />
              <span className="flex-1">Knowledge Base</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </Card>
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Frequently Asked Questions</h2>
          <Card className="p-4">
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {/* Contact Info */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-background">
          <h3 className="font-semibold mb-2">Need more help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our support team is available 24/7 to assist you
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Email:</strong> support@roomweave.com
            </p>
            <p>
              <strong>Phone:</strong> +1 (555) 123-4567
            </p>
            <p>
              <strong>Hours:</strong> 24/7
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
