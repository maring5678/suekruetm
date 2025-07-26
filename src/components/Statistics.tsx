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
      // Hole historische Gesamtpunkte
      const { data: historicalData, error: historicalError } = await supabase
        .from("historical_player_totals")
        .select("total_points")
        .eq("player_name", player.name)
        .maybeSingle();

      let historicalPoints = 0;
      if (!historicalError && historicalData) {
        historicalPoints = historicalData.total_points;
      }

      // Hole alle Rundenergebnisse für diesen Spieler (seit dem Import)
      const { data: results, error: resultsError } = await supabase
        .from("round_results")
        .select("points")
        .eq("player_id", player.id);

      if (resultsError) throw resultsError;

      // Berechne neue Punkte seit Import
      const newPoints = results?.reduce((sum, r) => sum + r.points, 0) || 0;
      
      // Gesamtpunkte = historische Punkte + neue Punkte
      const totalPoints = historicalPoints + newPoints;

      // Zeige alle Spieler an, auch die mit 0 Punkten
      stats.push({
        playerId: player.id,
        playerName: player.name,
        totalPoints,
        tournamentsPlayed: historicalPoints > 0 ? 1 : 0,
        roundsPlayed: results?.length || 0,
        firstPlaces: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        averagePointsPerRound: 0,
        averageRanking: 0,
        winRate: 0,
        podiumRate: 0,
      });
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
            {/* Einfache Punkteübersicht */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Spieler nach Gesamtpunkten
                </CardTitle>
                <CardDescription>
                  Rangliste aller Spieler basierend auf Gesamtpunktzahl
                </CardDescription>
              </CardHeader>
              <CardContent>
                {playerStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Spielerdaten gefunden. Erstelle zuerst ein Turnier mit Rundenergebnissen.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {playerStats.map((player, index) => (
                      <div key={player.playerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getRankIcon(index)}
                          <div>
                            <h3 className="font-semibold">{player.playerName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {player.roundsPlayed} Runden gespielt
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{player.totalPoints}</div>
                          <div className="text-sm text-muted-foreground">Punkte</div>
                        </div>
                      </div>
                    ))}
                  </div>
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