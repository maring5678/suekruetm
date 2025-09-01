import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Target, Trophy } from "lucide-react";

interface RoundDetail {
  roundNumber: number;
  trackName: string;
  position: number;
  points: number;
  tournamentName: string;
  date: string;
}

interface PlayerPerformanceChartProps {
  rounds: RoundDetail[];
  playerName: string;
}

export const PlayerPerformanceChart = ({ rounds, playerName }: PlayerPerformanceChartProps) => {
  // Bereite Daten für Line Chart vor (Points über Zeit)
  const lineChartData = rounds
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((round, index) => ({
      round: `R${round.roundNumber}`,
      points: round.points,
      position: round.position,
      tournament: round.tournamentName.length > 15 ? 
        round.tournamentName.substring(0, 15) + '...' : 
        round.tournamentName,
      index: index + 1
    }));

  // Position Verteilung für Pie Chart
  const positionCounts = rounds.reduce((acc, round) => {
    const pos = round.position;
    if (pos === 1) acc.first++;
    else if (pos === 2) acc.second++;
    else if (pos === 3) acc.third++;
    else acc.other++;
    return acc;
  }, { first: 0, second: 0, third: 0, other: 0 });

  const pieChartData = [
    { name: '1. Platz', value: positionCounts.first, color: 'hsl(var(--tournament-gold))' },
    { name: '2. Platz', value: positionCounts.second, color: 'hsl(var(--tournament-silver))' },
    { name: '3. Platz', value: positionCounts.third, color: 'hsl(var(--tournament-bronze))' },
    { name: 'Andere', value: positionCounts.other, color: 'hsl(var(--muted))' }
  ].filter(item => item.value > 0);

  // Durchschnittliche Performance pro Turnier
  const tournamentPerformance = rounds.reduce((acc, round) => {
    if (!acc[round.tournamentName]) {
      acc[round.tournamentName] = { totalPoints: 0, rounds: 0, name: round.tournamentName };
    }
    acc[round.tournamentName].totalPoints += round.points;
    acc[round.tournamentName].rounds++;
    return acc;
  }, {} as Record<string, { totalPoints: number; rounds: number; name: string }>);

  const tournamentChartData = Object.values(tournamentPerformance).map(tournament => ({
    tournament: tournament.name.length > 20 ? 
      tournament.name.substring(0, 20) + '...' : 
      tournament.name,
    avgPoints: tournament.totalPoints / tournament.rounds,
    totalPoints: tournament.totalPoints,
    rounds: tournament.rounds
  })).sort((a, b) => b.avgPoints - a.avgPoints);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">Punkte: {payload[0].value}</p>
          {data.position && <p className="text-muted-foreground">Position: {data.position}</p>}
          {data.tournament && <p className="text-muted-foreground">Turnier: {data.tournament}</p>}
        </div>
      );
    }
    return null;
  };

  if (rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Keine Daten für die Analyse verfügbar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points über Zeit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Punkteverlauf über Zeit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis dataKey="round" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Positionsverteilung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Positionsverteilung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Turnierperformance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Turnierperformance (⌀ Punkte)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tournamentChartData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="tournament" 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-primary">⌀ Punkte: {data.avgPoints.toFixed(1)}</p>
                          <p className="text-muted-foreground">Gesamt: {data.totalPoints} Punkte</p>
                          <p className="text-muted-foreground">Runden: {data.rounds}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="avgPoints" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};