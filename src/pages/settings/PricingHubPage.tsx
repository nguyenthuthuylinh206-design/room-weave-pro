import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const PricingDailyPage = lazy(() => import("./PricingDailyPage"));
const PricingV2Page = lazy(() => import("./PricingV2Page"));
const SeasonalRulesPage = lazy(() => import("./SeasonalRulesPage"));

const Fallback = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-96 w-full" />
  </div>
);

export default function PricingHubPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "daily";

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
        <div className="border-b px-4 pt-3">
          <h1 className="text-lg font-semibold mb-3">Quản lý giá phòng</h1>
          <TabsList className="bg-transparent p-0 h-auto border-b-0 gap-1">
            <TabsTrigger
              value="daily"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Lịch giá theo ngày
            </TabsTrigger>
            <TabsTrigger
              value="default"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Giá mặc định
            </TabsTrigger>
            <TabsTrigger
              value="seasonal"
              className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Quy tắc mùa
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="daily" className="m-0">
            <Suspense fallback={<Fallback />}>
              <PricingDailyPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="default" className="m-0">
            <Suspense fallback={<Fallback />}>
              <PricingV2Page />
            </Suspense>
          </TabsContent>
          <TabsContent value="seasonal" className="m-0">
            <Suspense fallback={<Fallback />}>
              <SeasonalRulesPage />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
