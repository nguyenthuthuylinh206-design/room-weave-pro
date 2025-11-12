import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Pause, Trophy } from 'lucide-react';
import { CreateABTestDialog } from './CreateABTestDialog';

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  variantA: {
    name: string;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
  };
  variantB: {
    name: string;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
  };
  startedAt?: string;
  completedAt?: string;
}

const sampleTests: ABTest[] = [
  {
    id: '1',
    name: 'Welcome Email Subject Test',
    status: 'running',
    variantA: {
      name: 'Variant A',
      subject: 'Welcome to our platform! 🎉',
      sent: 500,
      opened: 250,
      clicked: 75,
    },
    variantB: {
      name: 'Variant B',
      subject: 'Get started with your free trial',
      sent: 500,
      opened: 280,
      clicked: 90,
    },
    startedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Upgrade CTA Test',
    status: 'completed',
    variantA: {
      name: 'Variant A',
      subject: 'Upgrade now and save 20%',
      sent: 1000,
      opened: 450,
      clicked: 120,
    },
    variantB: {
      name: 'Variant B',
      subject: 'Limited time offer: Premium at 20% off',
      sent: 1000,
      opened: 520,
      clicked: 180,
    },
    startedAt: '2024-01-10',
    completedAt: '2024-01-14',
  },
];

export function ABTestingManager() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tests] = useState<ABTest[]>(sampleTests);

  const calculateRate = (opened: number, sent: number) => {
    return sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0';
  };

  const getWinner = (test: ABTest) => {
    const openRateA = parseFloat(calculateRate(test.variantA.opened, test.variantA.sent));
    const openRateB = parseFloat(calculateRate(test.variantB.opened, test.variantB.sent));
    
    if (openRateA > openRateB) return 'A';
    if (openRateB > openRateA) return 'B';
    return 'tie';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing</h2>
          <p className="text-muted-foreground">Test different versions to optimize performance</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create A/B Test
        </Button>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {tests.map((test) => {
          const winner = getWinner(test);
          
          return (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          test.status === 'running'
                            ? 'default'
                            : test.status === 'completed'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {test.status}
                      </Badge>
                      {test.status === 'completed' && winner !== 'tie' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Trophy className="h-3 w-3 mr-1" />
                          Winner: Variant {winner}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {test.status === 'running' && (
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Test
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Variant A */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        {test.variantA.name}
                        {winner === 'A' && <Trophy className="h-4 w-4 text-yellow-600" />}
                      </h4>
                      <span className="text-sm text-muted-foreground">
                        Open Rate: {calculateRate(test.variantA.opened, test.variantA.sent)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{test.variantA.subject}</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{test.variantA.sent}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{test.variantA.opened}</p>
                        <p className="text-xs text-muted-foreground">Opened</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{test.variantA.clicked}</p>
                        <p className="text-xs text-muted-foreground">Clicked</p>
                      </div>
                    </div>
                    <Progress
                      value={parseFloat(calculateRate(test.variantA.opened, test.variantA.sent))}
                      className="mt-2"
                    />
                  </div>

                  <div className="border-t pt-6">
                    {/* Variant B */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        {test.variantB.name}
                        {winner === 'B' && <Trophy className="h-4 w-4 text-yellow-600" />}
                      </h4>
                      <span className="text-sm text-muted-foreground">
                        Open Rate: {calculateRate(test.variantB.opened, test.variantB.sent)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{test.variantB.subject}</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{test.variantB.sent}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{test.variantB.opened}</p>
                        <p className="text-xs text-muted-foreground">Opened</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{test.variantB.clicked}</p>
                        <p className="text-xs text-muted-foreground">Clicked</p>
                      </div>
                    </div>
                    <Progress
                      value={parseFloat(calculateRate(test.variantB.opened, test.variantB.sent))}
                      className="mt-2"
                    />
                  </div>

                  {/* Test Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                    <span>Started: {test.startedAt}</span>
                    {test.completedAt && <span>Completed: {test.completedAt}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateABTestDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
