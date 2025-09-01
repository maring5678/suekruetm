import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BarChart3, Users, Calendar } from "lucide-react";

interface PlayerScore {
  player: { id: string; name: string };
  totalPoints: number;
  roundResults: Array<{
    round: number;
    track: string;
    position: number;
    points: number;
  }>;
}

interface TournamentAnalyticsProps {
  playerScores: PlayerScore[];
  currentRound: number;
}

export const TournamentAnalytics = ({ playerScores, currentRound }: TournamentAnalyticsProps) => {
  // Bereite Daten für Round-by-Round Analyse vor
  const roundAnalysisData = Array.from({ length: currentRound - 1 }, (_, i) => {
    const roundNum = i + 1;
    const roundData = playerScores.map(player => {
      const roundResult = player.roundResults.find(r => r.round === roundNum);
      return {
        player: player.player.name,
        points: roundResult?.points || 0,
        position: roundResult?.position || 0
      };
    }).sort((a, b) => b.points - a.points);

    const trackName = playerScores[0]?.roundResults.find(r => r.round === roundNum)?.track || `Runde ${roundNum}`;
    
    return {
      round: `R${roundNum}`,
      roundNumber: roundNum,
      track: trackName,
      maxPoints: Math.max(...roundData.map(p => p.points)),
      avgPoints: roundData.reduce((sum, p) => sum + p.points, 0) / roundData.length,
      minPoints: Math.min(...roundData.map(p => p.points)),
      winner: roundData[0]?.player || 'Unbekannt',
      winnerPoints: roundData[0]?.points || 0
    };
  });

  // Kumulative Punkte über Zeit
  const cumulativeData = Array.from({ length: currentRound - 1 }, (_, roundIndex) => {
    const roundNum = roundIndex + 1;
    const roundEntry: any = { round: `R${roundNum}` };
    
    playerScores.forEach(player => {
      const cumulativePoints = player.roundResults
        .filter(r => r.round <= roundNum)
        .reduce((sum, r) => sum + r.points, 0);
      roundEntry[player.player.name] = cumulativePoints;
    });
    
    return roundEntry;
  });

  // Player Performance Comparison
  const playerComparisonData = playerScores
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map(player => ({
      name: player.player.name.length > 12 ? 
        player.player.name.substring(0, 12) + '...' : 
        player.player.name,
      totalPoints: player.totalPoints,
      averagePoints: player.totalPoints / (player.roundResults.length || 1),
      roundsPlayed: player.roundResults.length,
      bestRound: Math.max(...player.roundResults.map(r => r.points), 0),
      worstRound: Math.min(...player.roundResults.map(r => r.points), 0)
    }));

  const getRandomColor = (index: number) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))',
      'hsl(var(--accent))',
      'hsl(var(--warning))',
      'hsl(var(--info))',
      'hsl(var(--success))',
      'hsl(var(--tournament-gold))',
      'hsl(var(--tournament-silver))',
      'hsl(var(--tournament-bronze))'
    ];
    return colors[index % colors.length];
  };

  if (currentRound <= 1 || playerScores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Turnier Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Mindestens eine Runde muss gespielt werden</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kumulative Punkteentwicklung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Kumulativer Punkteverlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis dataKey="round" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              {playerScores.map((player, index) => (
                <Area
                  key={player.player.id}
                  type="monotone"
                  dataKey={player.player.name}
                  stackId="1"
                  stroke={getRandomColor(index)}
                  fill={getRandomColor(index)}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rundenanalyse */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Rundenstatistiken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roundAnalysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="round" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{label}: {data.track}</p>
                          <p className="text-primary">Max: {data.maxPoints} Punkte</p>
                          <p className="text-secondary">⌀: {data.avgPoints.toFixed(1)} Punkte</p>
                          <p className="text-muted-foreground">Min: {data.minPoints} Punkte</p>
                          <p className="text-accent">Gewinner: {data.winner}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="maxPoints" fill="hsl(var(--primary))" name="Max Punkte" />
                <Bar dataKey="avgPoints" fill="hsl(var(--secondary))" name="⌀ Punkte" />
                <Bar dataKey="minPoints" fill="hsl(var(--muted))" name="Min Punkte" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spielervergleich */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Spielervergleich (Gesamtpunkte)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={playerComparisonData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))"
                  width={80}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-primary">Gesamt: {data.totalPoints} Punkte</p>
                          <p className="text-secondary">⌀: {data.averagePoints.toFixed(1)} Punkte</p>
                          <p className="text-success">Beste Runde: {data.bestRound} Punkte</p>
                          <p className="text-muted-foreground">Runden: {data.roundsPlayed}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="totalPoints" 
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};