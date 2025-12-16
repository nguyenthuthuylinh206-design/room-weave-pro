import { useTranslation } from 'react-i18next'
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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function HelpPage() {
  const { t } = useTranslation('common')
  
  const faqs = [
    {
      question: 'Làm sao để thêm sản phẩm mới vào kho?',
      answer: 'Vào trang Sản phẩm, nhấn "Thêm sản phẩm", điền thông tin như tên, mã, danh mục và mức tồn kho tối thiểu, sau đó lưu lại.'
    },
    {
      question: 'Làm sao để gửi đồ đi giặt?',
      answer: 'Vào mục Giặt là, nhấn "Tạo lô giặt", chọn đơn vị giặt, thêm các sản phẩm với số lượng tương ứng và gửi đi.'
    },
    {
      question: 'Làm sao để tạo báo cáo?',
      answer: 'Vào trang Báo cáo, chọn loại báo cáo (Kho, Giặt là hoặc Tài chính), chọn khoảng thời gian và nhấn Tạo báo cáo.'
    },
    {
      question: 'Làm sao để quản lý nhiều khách sạn?',
      answer: 'Sử dụng bộ chuyển đổi khách sạn ở thanh điều hướng. Bạn có thể thêm khách sạn mới trong Cài đặt > Quản lý khách sạn.'
    },
    {
      question: 'Làm sao để kiểm tra tồn kho trong phòng?',
      answer: 'Vào trang Phòng, chọn phòng cần kiểm tra, sau đó xem tab "Đồ dùng trong phòng" để thấy danh sách và trạng thái thiếu/đủ.'
    },
    {
      question: 'Làm sao để tạo yêu cầu bảo trì?',
      answer: 'Vào mục Bảo trì, nhấn "Tạo yêu cầu", điền tiêu đề, mô tả vấn đề, chọn vị trí và mức độ ưu tiên, sau đó gửi yêu cầu.'
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('help.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('help.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{t('help.liveChat')}</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{t('help.sendEmail')}</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Phone className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{t('help.callSupport')}</span>
            </div>
          </Card>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex flex-col items-center text-center gap-2">
              <Book className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{t('help.userGuide')}</span>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('help.resources')}</h2>
          <Card>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors">
              <Video className="h-5 w-5 text-primary" />
              <span className="flex-1">{t('help.videoTutorials')}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-t">
              <FileText className="h-5 w-5 text-primary" />
              <span className="flex-1">{t('help.documentation')}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-t">
              <Book className="h-5 w-5 text-primary" />
              <span className="flex-1">{t('help.knowledgeBase')}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('help.faq')}</h2>
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

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-background">
          <h3 className="font-semibold mb-2">{t('help.needMoreHelp')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('help.supportAvailable')}
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{t('help.email')}:</strong> hotro@roomweave.vn
            </p>
            <p>
              <strong>{t('help.phone')}:</strong> 1900 xxxx xx
            </p>
            <p>
              <strong>{t('help.hours')}:</strong> 24/7
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
