import { lazy, Suspense } from 'react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { HeroSection } from '@/components/landing/HeroSection'

// Below-the-fold sections: lazy-load để landing FCP/LCP nhanh hơn.
// Hero hiển thị ngay; Features/Pricing/Footer load song song sau khi
// chunk hero đã render — không chặn paint đầu tiên.
const FeaturesSection = lazy(() =>
  import('@/components/landing/FeaturesSection').then((m) => ({ default: m.FeaturesSection }))
)
const PricingSection = lazy(() =>
  import('@/components/landing/PricingSection').then((m) => ({ default: m.PricingSection }))
)
const FooterSection = lazy(() =>
  import('@/components/landing/FooterSection').then((m) => ({ default: m.FooterSection }))
)

const SectionSkeleton = () => <div className="min-h-[40vh]" aria-hidden="true" />

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <LandingNavbar />
      <HeroSection />
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PricingSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FooterSection />
      </Suspense>
    </div>
  )
}

export default LandingPage
