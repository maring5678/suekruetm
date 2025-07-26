import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, TrendingUp, Users, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerStats {
  playerId: string;
  playerName: string;
  totalPoints: number;
  tournamentsPlayed: number;
  roundsPlayed: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  averagePointsPerRound: number;
  averageRanking: number;
  winRate: number;
  podiumRate: number;
}

interface TournamentStats {
  totalTournaments: number;
  completedTournaments: number;
  totalRounds: number;
  totalPlayers: number;
  averagePlayersPerTournament: number;
  averageRoundsPerTournament: number;
}

interface StatisticsProps {
  onBack: () => void;
}

export function Statistics({ onBack }: StatisticsProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [tournamentStats, setTournamentStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      await Promise.all([loadPlayerStatistics(), loadTournamentStatistics()]);
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
      toast({
        title: "Fehler",
        description: "Statistiken konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerStatistics = async () => {
    // Hole alle Spieler
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name");

    if (playersError) throw playersError;

    const stats: PlayerStats[] = [];

    for (const player of players || []) {
      // Hole alle Rundenergebnisse für diesen Spieler
      const { data: results, error: resultsError } = await supabase
        .from("round_results")
        .select(`
          position,
          points,
          round_id,
          rounds!inner(
            tournament_id,
            tournaments!inner(completed_at)
          )
        `)
        .eq("player_id", player.id);

      if (resultsError) throw resultsError;

      // Filtere nur Ergebnisse aus abgeschlossenen Turnieren
      const completedResults = results?.filter(r => 
        r.rounds?.tournaments?.completed_at !== null
      ) || [];

      // Berechne Statistiken
      const totalPoints = completedResults.reduce((sum, r) => sum + r.points, 0);
      const roundsPlayed = completedResults.length;
      const firstPlaces = completedResults.filter(r => r.position === 1).length;
      const secondPlaces = completedResults.filter(r => r.position === 2).length;
      const thirdPlaces = completedResults.filter(r => r.position === 3).length;
      
      // Hole Turniere für diesen Spieler
      const { data: tournaments } = await supabase
        .from("tournament_players")
        .select(`
          tournament_id,
          tournaments!inner(completed_at)
        `)
        .eq("player_id", player.id);

      const completedTournaments = tournaments?.filter(t => 
        t.tournaments?.completed_at !== null
      ).length || 0;

      // Berechne Durchschnittswerte
      const averagePointsPerRound = roundsPlayed > 0 ? totalPoints / roundsPlayed : 0;
      
      // Für durchschnittliche Platzierung: Nur gezählte Plätze (1-3) verwenden
      const rankedResults = completedResults.filter(r => r.position <= 3);
      const averageRanking = rankedResults.length > 0 
        ? rankedResults.reduce((sum, r) => sum + r.position, 0) / rankedResults.length
        : 0;
      
      const winRate = roundsPlayed > 0 ? (firstPlaces / roundsPlayed) * 100 : 0;
      const podiumRate = roundsPlayed > 0 ? ((firstPlaces + secondPlaces + thirdPlaces) / roundsPlayed) * 100 : 0;

      if (roundsPlayed > 0) {
        stats.push({
          playerId: player.id,
          playerName: player.name,
          totalPoints,
          tournamentsPlayed: completedTournaments,
          roundsPlayed,
          firstPlaces,
          secondPlaces,
          thirdPlaces,
          averagePointsPerRound,
          averageRanking,
          winRate,
          podiumRate,
        });
      }
    }

    // Sortiere nach Gesamtpunkten
    stats.sort((a, b) => b.totalPoints - a.totalPoints);
    setPlayerStats(stats);
  };

  const loadTournamentStatistics = async () => {
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("id, completed_at");

    if (tournamentsError) throw tournamentsError;

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("tournament_id");

    if (roundsError) throw roundsError;

    const { data: allPlayers, error: playersError } = await supabase
      .from("tournament_players")
      .select("tournament_id");

    if (playersError) throw playersError;

    const totalTournaments = tournaments?.length || 0;
    const completedTournaments = tournaments?.filter(t => t.completed_at !== null).length || 0;
    const totalRounds = rounds?.length || 0;
    
    // Einzigartige Spieler pro Turnier zählen
    const tournamentPlayerCounts = allPlayers?.reduce((acc, tp) => {
      acc[tp.tournament_id] = (acc[tp.tournament_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const totalPlayers = Object.keys(tournamentPlayerCounts).length > 0 
      ? Object.values(tournamentPlayerCounts).reduce((sum, count) => sum + count, 0) 
      : 0;

    const averagePlayersPerTournament = totalTournaments > 0 
      ? totalPlayers / totalTournaments 
      : 0;

    const averageRoundsPerTournament = totalTournaments > 0 
      ? totalRounds / totalTournaments 
      : 0;

    setTournamentStats({
      totalTournaments,
      completedTournaments,
      totalRounds,
      totalPlayers,
      averagePlayersPerTournament,
      averageRoundsPerTournament,
    });
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Trophy className="h-5 w-5 text-gray-400" />;
      case 2: return <Trophy className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-medium">{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-3xl font-bold">Statistiken</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Statistiken werden geladen...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold">Statistiken</h1>
        </div>

        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="players">Spieler</TabsTrigger>
            <TabsTrigger value="tournaments">Turniere</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-6">
            {/* Übersicht der Top Spieler */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meiste Punkte</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {playerStats[0]?.playerName || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {playerStats[0]?.totalPoints || 0} Punkte
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Beste Siegrate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {playerStats.sort((a, b) => b.winRate - a.winRate)[0]?.playerName || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(playerStats.sort((a, b) => b.winRate - a.winRate)[0]?.winRate || 0).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meiste Siege</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {playerStats.sort((a, b) => b.firstPlaces - a.firstPlaces)[0]?.playerName || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {playerStats.sort((a, b) => b.firstPlaces - a.firstPlaces)[0]?.firstPlaces || 0} Siege
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Beste Podiumsrate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {playerStats.sort((a, b) => b.podiumRate - a.podiumRate)[0]?.playerName || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(playerStats.sort((a, b) => b.podiumRate - a.podiumRate)[0]?.podiumRate || 0).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detaillierte Spielerstatistiken */}
            <Card>
              <CardHeader>
                <CardTitle>Alle Spieler Statistiken</CardTitle>
                <CardDescription>
                  Umfassende Leistungsanalyse aller Spieler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {playerStats.map((player, index) => (
                    <div key={player.playerId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getRankIcon(index)}
                          <div>
                            <h3 className="font-semibold text-lg">{player.playerName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {player.totalPoints} Gesamtpunkte
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={player.winRate > 20 ? "default" : "secondary"}>
                            {player.winRate.toFixed(1)}% Siegrate
                          </Badge>
                          <Badge variant="outline">
                            {player.podiumRate.toFixed(1)}% Podium
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Turniere</p>
                          <p className="font-medium">{player.tournamentsPlayed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Runden</p>
                          <p className="font-medium">{player.roundsPlayed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">1. Plätze</p>
                          <p className="font-medium text-yellow-600">{player.firstPlaces}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">2. Plätze</p>
                          <p className="font-medium text-gray-600">{player.secondPlaces}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">3. Plätze</p>
                          <p className="font-medium text-amber-700">{player.thirdPlaces}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ø Punkte/Runde</p>
                          <p className="font-medium">{player.averagePointsPerRound.toFixed(1)}</p>
                        </div>
                        {player.averageRanking > 0 && (
                          <div>
                            <p className="text-muted-foreground">Ø Platzierung*</p>
                            <p className="font-medium">{player.averageRanking.toFixed(1)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {playerStats.some(p => p.averageRanking > 0) && (
                  <p className="text-xs text-muted-foreground mt-4">
                    * Durchschnittliche Platzierung basiert nur auf Top-3-Plätzen (1-3)
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            {tournamentStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gesamt Turniere</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tournamentStats.totalTournaments}</div>
                    <p className="text-xs text-muted-foreground">
                      {tournamentStats.completedTournaments} abgeschlossen
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gesamt Runden</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tournamentStats.totalRounds}</div>
                    <p className="text-xs text-muted-foreground">
                      Ø {tournamentStats.averageRoundsPerTournament.toFixed(1)} pro Turnier
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Spieler Teilnahmen</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tournamentStats.totalPlayers}</div>
                    <p className="text-xs text-muted-foreground">
                      Ø {tournamentStats.averagePlayersPerTournament.toFixed(1)} pro Turnier
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Turnierübersicht</CardTitle>
                <CardDescription>
                  Allgemeine Statistiken über alle Turniere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{tournamentStats?.completedTournaments || 0}</div>
                      <p className="text-sm text-muted-foreground">Abgeschlossene Turniere</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{tournamentStats?.totalRounds || 0}</div>
                      <p className="text-sm text-muted-foreground">Gespielte Runden</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {playerStats.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Aktive Spieler</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {playerStats.reduce((sum, p) => sum + p.totalPoints, 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">Gesamtpunkte vergeben</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}