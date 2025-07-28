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
    console.log("Loading player statistics...");
    
    // Hole alle Spieler
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name");

    if (playersError) {
      console.error("Error loading players:", playersError);
      throw playersError;
    }

    console.log(`Found ${players?.length || 0} players`);

    const stats: PlayerStats[] = [];

    for (const player of players || []) {
      console.log(`Processing player: ${player.name}`);
      
      // Hole historische Gesamtpunkte (aus den Excel-Importen)
      const { data: historicalData, error: historicalError } = await supabase
        .from("historical_player_totals")
        .select("total_points, tournaments_played")
        .eq("player_name", player.name)
        .maybeSingle();

      let historicalPoints = 0;
      let historicalTournaments = 0;
      if (!historicalError && historicalData) {
        historicalPoints = historicalData.total_points;
        historicalTournaments = historicalData.tournaments_played;
        console.log(`${player.name} historical: ${historicalPoints} points, ${historicalTournaments} tournaments`);
      }

      // Hole alle Rundenergebnisse für diesen Spieler (aus neuen manuellen Turnieren)
      const { data: roundResults, error: resultsError } = await supabase
        .from("round_results")
        .select(`
          points, 
          round_id,
          rounds!inner(
            tournament_id,
            tournaments!inner(name, created_at)
          )
        `)
        .eq("player_id", player.id);

      if (resultsError) {
        console.error(`Error loading round results for ${player.name}:`, resultsError);
        throw resultsError;
      }

      // Berechne Punkte aus manuellen Turnieren
      const manualPoints = roundResults?.reduce((sum, r) => sum + r.points, 0) || 0;
      
      // Zähle einzigartige manuelle Turniere
      const uniqueManualTournaments = new Set(
        roundResults?.map(r => r.rounds.tournament_id) || []
      );
      const manualTournaments = uniqueManualTournaments.size;
      
      console.log(`${player.name} manual: ${manualPoints} points, ${manualTournaments} tournaments, ${roundResults?.length || 0} rounds`);
      
      // Gesamtstatistiken
      const totalPoints = historicalPoints + manualPoints;
      const totalTournaments = historicalTournaments + manualTournaments;
      const totalRounds = (roundResults?.length || 0);

      // Berechne Durchschnittspunkte pro Runde (nur für manuelle Turniere, da historische bereits aggregiert sind)
      const averagePointsPerRound = totalRounds > 0 ? manualPoints / totalRounds : 0;

      console.log(`${player.name} TOTAL: ${totalPoints} points, ${totalTournaments} tournaments, ${totalRounds} rounds`);

      stats.push({
        playerId: player.id,
        playerName: player.name,
        totalPoints,
        tournamentsPlayed: totalTournaments,
        roundsPlayed: totalRounds,
        firstPlaces: 0, // TODO: Berechnen basierend auf Rankings
        secondPlaces: 0,
        thirdPlaces: 0,
        averagePointsPerRound,
        averageRanking: 0, // TODO: Implementieren
        winRate: 0, // TODO: Implementieren
        podiumRate: 0, // TODO: Implementieren
      });
    }

    // Sortiere nach Gesamtpunkten
    stats.sort((a, b) => b.totalPoints - a.totalPoints);
    console.log("Final player stats:", stats);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Statistiken
            </h1>
            <p className="text-muted-foreground text-lg">
              Umfassende Auswertung aller Turnierdaten
            </p>
          </div>
        </div>

        <Tabs defaultValue="players" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-lg grid-cols-2 p-1 h-12 shadow-lg bg-card">
              <TabsTrigger value="players" className="flex items-center gap-2 text-sm font-medium">
                <Trophy className="h-4 w-4" />
                Spieler
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                Turniere
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="players" className="space-y-8">
            {/* Top Players Podium */}
            {playerStats.length >= 3 && (
              <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-card to-accent/10">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Trophy className="h-6 w-6 text-tournament-gold" />
                    Top 3 Spieler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center items-end gap-8 mb-6">
                    {/* 2nd Place */}
                    {playerStats[1] && (
                      <div className="text-center">
                        <div className="w-20 h-24 bg-gradient-to-t from-tournament-silver/20 to-tournament-silver/40 rounded-t-lg flex items-end justify-center pb-2 mb-3">
                          <Trophy className="h-8 w-8 text-tournament-silver" />
                        </div>
                        <h3 className="font-bold text-lg">{playerStats[1].playerName}</h3>
                        <p className="text-2xl font-bold text-tournament-silver">{playerStats[1].totalPoints}</p>
                        <Badge variant="secondary" className="mt-2">2. Platz</Badge>
                      </div>
                    )}
                    
                    {/* 1st Place */}
                    {playerStats[0] && (
                      <div className="text-center">
                        <div className="w-24 h-32 bg-gradient-to-t from-tournament-gold/20 to-tournament-gold/40 rounded-t-lg flex items-end justify-center pb-2 mb-3">
                          <Trophy className="h-10 w-10 text-tournament-gold" />
                        </div>
                        <h3 className="font-bold text-xl">{playerStats[0].playerName}</h3>
                        <p className="text-3xl font-bold text-tournament-gold">{playerStats[0].totalPoints}</p>
                        <Badge className="mt-2 bg-tournament-gold text-black">Champion</Badge>
                      </div>
                    )}
                    
                    {/* 3rd Place */}
                    {playerStats[2] && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-t from-tournament-bronze/20 to-tournament-bronze/40 rounded-t-lg flex items-end justify-center pb-2 mb-3">
                          <Trophy className="h-7 w-7 text-tournament-bronze" />
                        </div>
                        <h3 className="font-bold text-lg">{playerStats[2].playerName}</h3>
                        <p className="text-2xl font-bold text-tournament-bronze">{playerStats[2].totalPoints}</p>
                        <Badge variant="outline" className="mt-2 border-tournament-bronze text-tournament-bronze">3. Platz</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Players Leaderboard */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Vollständige Rangliste
                </CardTitle>
                <CardDescription>
                  Alle Spieler sortiert nach Gesamtpunktzahl
                </CardDescription>
              </CardHeader>
              <CardContent>
                {playerStats.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">
                      Keine Spielerdaten gefunden
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Erstelle zuerst ein Turnier mit Rundenergebnissen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playerStats.map((player, index) => (
                      <div 
                        key={player.playerId} 
                        className={`
                          group relative overflow-hidden rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md
                          ${index < 3 
                            ? 'bg-gradient-to-r from-accent/20 via-accent/10 to-background border-2 border-accent/30' 
                            : 'bg-card border hover:border-accent/50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`
                              flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg
                              ${index === 0 ? 'bg-tournament-gold text-black' :
                                index === 1 ? 'bg-tournament-silver text-black' :
                                index === 2 ? 'bg-tournament-bronze text-white' :
                                'bg-muted text-muted-foreground'
                              }
                            `}>
                              {index < 3 ? <Trophy className="h-5 w-5" /> : index + 1}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                                {player.playerName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {player.tournamentsPlayed} Turniere gespielt
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`
                              text-3xl font-bold transition-all duration-200 group-hover:scale-110
                              ${index === 0 ? 'text-tournament-gold' :
                                index === 1 ? 'text-tournament-silver' :
                                index === 2 ? 'text-tournament-bronze' :
                                'text-foreground'
                              }
                            `}>
                              {player.totalPoints}
                            </div>
                            <div className="text-sm text-muted-foreground">Punkte</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-8">
            {/* Key Metrics Overview */}
            {tournamentStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">{tournamentStats.completedTournaments} abgeschlossen</Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1">{tournamentStats.totalTournaments}</div>
                    <p className="text-muted-foreground">Gesamt Turniere</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-info/10 rounded-full">
                        <TrendingUp className="h-6 w-6 text-info" />
                      </div>
                      <Badge variant="outline">Ø {tournamentStats.averageRoundsPerTournament.toFixed(1)}</Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1">{tournamentStats.totalRounds}</div>
                    <p className="text-muted-foreground">Gesamt Runden</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-success/10 rounded-full">
                        <Users className="h-6 w-6 text-success" />
                      </div>
                      <Badge variant="outline">Ø {tournamentStats.averagePlayersPerTournament.toFixed(1)}</Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1">{tournamentStats.totalPlayers}</div>
                    <p className="text-muted-foreground">Teilnahmen</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-warning/10 rounded-full">
                        <Target className="h-6 w-6 text-warning" />
                      </div>
                      <Badge variant="outline">{playerStats.length} Aktiv</Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {playerStats.reduce((sum, p) => sum + p.totalPoints, 0)}
                    </div>
                    <p className="text-muted-foreground">Gesamtpunkte</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Detailed Tournament Statistics */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-primary" />
                  Turnieranalyse
                </CardTitle>
                <CardDescription>
                  Detaillierte Statistiken und Kennzahlen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                      <span className="font-medium">Abschlussrate</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-success">
                          {tournamentStats ? Math.round((tournamentStats.completedTournaments / tournamentStats.totalTournaments) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">der Turniere</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                      <span className="font-medium">Aktivitätslevel</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-info">
                          {tournamentStats ? tournamentStats.averageRoundsPerTournament.toFixed(1) : 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Runden/Turnier</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                      <span className="font-medium">Beteiligung</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-warning">
                          {tournamentStats ? tournamentStats.averagePlayersPerTournament.toFixed(1) : 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Spieler/Turnier</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                      <span className="font-medium">Durchschnittspunkte</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {playerStats.length > 0 ? Math.round(playerStats.reduce((sum, p) => sum + p.totalPoints, 0) / playerStats.length) : 0}
                        </div>
                        <div className="text-sm text-muted-foreground">pro Spieler</div>
                      </div>
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