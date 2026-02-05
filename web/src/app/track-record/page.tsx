'use client';

import { useTrackRecord } from '@/hooks/useMarkets';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TrackRecordPage() {
  const { data: trackRecord, isLoading } = useTrackRecord();

  // Calculate aggregate stats
  const stats = trackRecord
    ? {
        total: trackRecord.length,
        correct: trackRecord.filter((r) =>
          (r.predictedProbability >= 0.5 && r.actualOutcome) ||
          (r.predictedProbability < 0.5 && !r.actualOutcome)
        ).length,
        avgBrier: trackRecord.reduce((sum, r) => sum + r.brierScore, 0) / trackRecord.length,
      }
    : null;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Track Record</h1>
      <p className="text-muted-foreground mb-8">
        Historical accuracy of prediction markets in past elections.
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {((stats.correct / stats.total) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Correct Predictions ({stats.correct}/{stats.total})
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.avgBrier.toFixed(3)}</div>
                <div className="text-sm text-muted-foreground">
                  Average Brier Score (lower is better)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">
                  Elections Tracked
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Explanation Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Understanding Brier Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The Brier score measures the accuracy of probabilistic predictions. It ranges from 0 to 1,
            where 0 indicates perfect predictions and 1 indicates completely wrong predictions.
            A Brier score of 0.25 is equivalent to random guessing for binary outcomes.
          </p>
        </CardContent>
      </Card>

      {/* Track Record Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead className="text-center">Probability</TableHead>
                    <TableHead className="text-center">Outcome</TableHead>
                    <TableHead className="text-center">Brier Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackRecord?.map((entry) => {
                    const wasCorrect =
                      (entry.predictedProbability >= 0.5 && entry.actualOutcome) ||
                      (entry.predictedProbability < 0.5 && !entry.actualOutcome);

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.year}</TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>{entry.state || '-'}</TableCell>
                        <TableCell>{entry.candidate}</TableCell>
                        <TableCell className="text-center font-mono">
                          {formatPercent(entry.predictedProbability)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={entry.actualOutcome ? 'default' : 'secondary'}>
                            {entry.actualOutcome ? 'Won' : 'Lost'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              entry.brierScore < 0.15
                                ? 'text-green-600'
                                : entry.brierScore > 0.4
                                ? 'text-red-600'
                                : ''
                            }
                          >
                            {entry.brierScore.toFixed(3)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
