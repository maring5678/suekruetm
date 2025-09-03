import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, TrendingUp, Calendar, Target, BarChart3, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlayerPerformanceChart } from "@/components/charts/PlayerPerformanceChart";
import { PlayerAchievements } from "@/components/enhanced/PlayerAchievements";

interface PlayerDetailProps {
  playerId: string;
  playerName: string;
  onBack: () => void;
}

interface TournamentDetail {
  id: string;
  name: string;
  createdAt: string;
  completedAt: string | null;
  totalPoints: number;
  roundsPlayed: number;
  averagePoints: number;
  bestPosition: number;
  worstPosition: number;
}

interface RoundDetail {
  roundNumber: number;
  trackName: string;
  position: number;
  points: number;
  tournamentName: string;
  date: string;
}

export const PlayerDetail = ({ playerId, playerName, onBack }: PlayerDetailProps) => {
  const [tournaments, setTournaments] = useState<TournamentDetail[]>([]);
  const [rounds, setRounds] = useState<RoundDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<TournamentDetail | null>(null);
  const [tournamentRounds, setTournamentRounds] = useState<RoundDetail[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalPoints: 0,
    tournamentsPlayed: 0,
    roundsPlayed: 0,
    averagePointsPerRound: 0,
    bestTournament: 0,
    winRate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPlayerDetails();
  }, [playerId]);

  const loadPlayerDetails = async () => {
    try {
      setLoading(true);

      // Lade alle Rundenergebnisse für diesen Spieler
      const { data: roundResults, error: roundError } = await supabase
        .from('round_results')
        .select(`
          points,
          position,
          rounds!inner(
            round_number,
            track_name,
            tournament_id,
            tournaments!inner(
              name,
              created_at,
              completed_at
            )
          )
        `)
        .eq('player_id', playerId);

      if (roundError) throw roundError;

      // Lade auch die Gesamtrundenanzahl pro Turnier
      const { data: tournamentRoundCounts, error: roundCountError } = await supabase
        .from('rounds')
        .select('tournament_id, round_number')
        .in('tournament_id', [...new Set(roundResults?.map(r => r.rounds.tournament_id) || [])]);

      if (roundCountError) throw roundCountError;

      // Für importierte Turniere: Berechne die Rundenanzahl basierend auf der Anzahl der Ergebnisse pro Turnier
      const { data: tournamentResultCounts, error: resultCountError } = await supabase
        .from('round_results')
        .select('round_id, rounds!inner(tournament_id)')
        .in('rounds.tournament_id', [...new Set(roundResults?.map(r => r.rounds.tournament_id) || [])]);

      if (resultCountError) throw resultCountError;

      // Lade historische Daten
      const { data: historicalData } = await supabase
        .from('historical_player_totals')
        .select('total_points, tournaments_played')
        .eq('player_name', playerName)
        .maybeSingle();

      // Erstelle eine Map für die Gesamtrundenanzahl pro Turnier
      const tournamentTotalRounds = new Map<string, number>();
      tournamentRoundCounts?.forEach(round => {
        const current = tournamentTotalRounds.get(round.tournament_id) || 0;
        tournamentTotalRounds.set(round.tournament_id, Math.max(current, round.round_number));
      });

      // Für importierte Turniere: Berechne Rundenanzahl basierend auf Anzahl der Ergebnisse
      const tournamentResultsCount = new Map<string, number>();
      tournamentResultCounts?.forEach(result => {
        const tournamentId = result.rounds.tournament_id;
        const current = tournamentResultsCount.get(tournamentId) || 0;
        tournamentResultsCount.set(tournamentId, current + 1);
      });

      // Bestimme die richtige Rundenanzahl: Verwende die höhere Zahl zwischen rounds und results
      const getTournamentRoundCount = (tournamentId: string) => {
        const roundsCount = tournamentTotalRounds.get(tournamentId) || 0;
        const resultsCount = tournamentResultsCount.get(tournamentId) || 0;
        
        // Für importierte Turniere (wenige Runden, aber viele Ergebnisse) verwende die Ergebnisanzahl
        if (roundsCount === 1 && resultsCount > 1) {
          return resultsCount;
        }
        
        // Ansonsten verwende die normale Rundenzahl
        return Math.max(roundsCount, 1);
      };

      // Gruppiere Rundenergebnisse nach Turnieren
      const tournamentMap = new Map<string, TournamentDetail>();
      const allRounds: RoundDetail[] = [];

      roundResults?.forEach(result => {
        const tournament = result.rounds.tournaments;
        const tournamentId = result.rounds.tournament_id;

        // Füge Runde zu allRounds hinzu
        allRounds.push({
          roundNumber: result.rounds.round_number,
          trackName: result.rounds.track_name,
          position: result.position,
          points: result.points,
          tournamentName: tournament.name,
          date: tournament.created_at
        });

        // Aktualisiere Turnier-Statistiken
        if (!tournamentMap.has(tournamentId)) {
          const totalRoundsInTournament = getTournamentRoundCount(tournamentId);
          tournamentMap.set(tournamentId, {
            id: tournamentId,
            name: tournament.name,
            createdAt: tournament.created_at,
            completedAt: tournament.completed_at,
            totalPoints: 0,
            roundsPlayed: totalRoundsInTournament,
            averagePoints: 0,
            bestPosition: Infinity,
            worstPosition: 0
          });
        }

        const tournamentDetail = tournamentMap.get(tournamentId)!;
        tournamentDetail.totalPoints += result.points;
        tournamentDetail.bestPosition = Math.min(tournamentDetail.bestPosition, result.position);
        tournamentDetail.worstPosition = Math.max(tournamentDetail.worstPosition, result.position);
        
        // Berechne den Durchschnitt basierend auf gespielten Runden, nicht auf Gesamtrunden
        const playedRounds = roundResults?.filter(r => r.rounds.tournament_id === tournamentId).length || 1;
        tournamentDetail.averagePoints = tournamentDetail.totalPoints / playedRounds;
      });

      const tournamentList = Array.from(tournamentMap.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Berechne Gesamtstatistiken
      const manualPoints = allRounds.reduce((sum, round) => sum + round.points, 0);
      const historicalPoints = historicalData?.total_points || 0;
      const historicalTournaments = historicalData?.tournaments_played || 0;

      const totalPoints = manualPoints + historicalPoints;
      const tournamentsPlayed = tournamentList.length + historicalTournaments;
      const roundsPlayed = allRounds.length;
      const averagePointsPerRound = roundsPlayed > 0 ? manualPoints / roundsPlayed : 0;
      const bestTournament = tournamentList.length > 0 ? Math.max(...tournamentList.map(t => t.totalPoints)) : 0;
      const firstPlaces = allRounds.filter(r => r.position === 1).length;
      const winRate = roundsPlayed > 0 ? (firstPlaces / roundsPlayed) * 100 : 0;

      setTournaments(tournamentList);
      setRounds(allRounds);
      setTotalStats({
        totalPoints,
        tournamentsPlayed,
        roundsPlayed,
        averagePointsPerRound,
        bestTournament,
        winRate
      });

    } catch (error) {
      console.error('Fehler beim Laden der Spielerdetails:', error);
      toast({
        title: "Fehler",
        description: "Spielerdetails konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentClick = async (tournament: TournamentDetail) => {
    try {
      setSelectedTournament(tournament);
      
      // Lade alle Runden dieses Turniers (nicht nur die vom Spieler)
      const { data: allRoundsData, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id,
          round_number,
          track_name,
          tournament_id
        `)
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: true });

      if (roundsError) throw roundsError;

      // Lade die Ergebnisse des Spielers für diese Runden
      const { data: playerResultsData, error: resultsError } = await supabase
        .from('round_results')
        .select(`
          points,
          position,
          round_id
        `)
        .eq('player_id', playerId)
        .in('round_id', allRoundsData?.map(r => r.id) || []);

      if (resultsError) throw resultsError;

      // Erstelle eine Map für schnelle Suche der Spielerergebnisse
      const resultsMap = new Map(playerResultsData?.map(result => [
        result.round_id,
        { points: result.points, position: result.position }
      ]) || []);

      // Kombiniere alle Runden mit den Spielerergebnissen
      const rounds: RoundDetail[] = allRoundsData?.map(round => ({
        roundNumber: round.round_number,
        trackName: round.track_name,
        position: resultsMap.get(round.id)?.position || 0, // 0 bedeutet nicht teilgenommen
        points: resultsMap.get(round.id)?.points || 0,
        tournamentName: tournament.name,
        date: tournament.createdAt
      })) || [];

      setTournamentRounds(rounds);
    } catch (error) {
      console.error('Fehler beim Laden der Turnierdetails:', error);
      toast({
        title: "Fehler",
        description: "Turnierdetails konnten nicht geladen werden",
        variant: "destructive"
      });
    }
  };

  const handleBackToTournaments = () => {
    setSelectedTournament(null);
    setTournamentRounds([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-3xl font-bold">Spielerdetails</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Lade Spielerdetails...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleBackToTournaments} variant="outline" size="sm" className="shadow-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zu Turnieren
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {selectedTournament.name}
              </h1>
              <p className="text-muted-foreground text-lg">Rundendetails für {playerName}</p>
            </div>
          </div>

          {/* Turnierübersicht */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{selectedTournament.totalPoints}</div>
                <p className="text-sm text-muted-foreground">Gesamtpunkte</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary">{selectedTournament.roundsPlayed}</div>
                <p className="text-sm text-muted-foreground">Runden gespielt</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{selectedTournament.averagePoints.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">⌀ Punkte/Runde</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">{selectedTournament.bestPosition}.</div>
                <p className="text-sm text-muted-foreground">Beste Position</p>
              </CardContent>
            </Card>
          </div>

          {/* Rundendetails */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Alle Runden ({tournamentRounds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournamentRounds.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Keine Runden gefunden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tournamentRounds.map((round, index) => (
                    <div key={index} className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                          ${round.position === 0 ? 'bg-muted text-muted-foreground' :
                            round.position === 1 ? 'bg-tournament-gold text-black' :
                            round.position === 2 ? 'bg-tournament-silver text-black' :
                            round.position === 3 ? 'bg-tournament-bronze text-white' :
                            'bg-muted text-muted-foreground'
                          }
                        `}>
                          {round.position === 0 ? '-' : round.position}
                        </div>
                        <div>
                          <h4 className="font-medium text-lg">Runde {round.roundNumber}</h4>
                          <p className="text-sm text-muted-foreground">{round.trackName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{round.points}</div>
                        <div className="text-sm text-muted-foreground">
                          {round.position === 0 ? 'Nicht teilgenommen' : 'Punkte'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {playerName}
            </h1>
            <p className="text-muted-foreground text-lg">Detaillierte Spielerstatistiken</p>
          </div>
        </div>

        {/* Statistik Übersicht */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalStats.totalPoints}</div>
              <p className="text-sm text-muted-foreground">Gesamtpunkte</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary">{totalStats.tournamentsPlayed}</div>
              <p className="text-sm text-muted-foreground">Turniere</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">{totalStats.roundsPlayed}</div>
              <p className="text-sm text-muted-foreground">Runden</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{totalStats.averagePointsPerRound.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">⌀ Punkte/Runde</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-info">{totalStats.bestTournament}</div>
              <p className="text-sm text-muted-foreground">Bestes Turnier</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{totalStats.winRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Siegrate</p>
            </CardContent>
          </Card>
        </div>

        {/* Turniere */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Turniere ({tournaments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournaments.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Turniere gespielt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div 
                    key={tournament.id} 
                    className="border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer"
                    onClick={() => handleTournamentClick(tournament)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors">{tournament.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(tournament.createdAt).toLocaleDateString()}
                          </span>
                          <span>{tournament.roundsPlayed} Runden</span>
                          <Badge variant={tournament.completedAt ? "default" : "outline"}>
                            {tournament.completedAt ? "Abgeschlossen" : "Laufend"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{tournament.totalPoints}</div>
                        <div className="text-sm text-muted-foreground">
                          ⌀ {tournament.averagePoints.toFixed(1)} Punkte/Runde
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Beste: {tournament.bestPosition}. | Schlechteste: {tournament.worstPosition}.
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Erweiterte Analyse mit Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="rounds" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Runden
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Turniere Übersicht */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Turniere ({tournaments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Noch keine Turniere gespielt</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <div 
                        key={tournament.id} 
                        className="border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer"
                        onClick={() => handleTournamentClick(tournament)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg hover:text-primary transition-colors">{tournament.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(tournament.createdAt).toLocaleDateString()}
                              </span>
                              <span>{tournament.roundsPlayed} Runden</span>
                              <Badge variant={tournament.completedAt ? "default" : "outline"}>
                                {tournament.completedAt ? "Abgeschlossen" : "Laufend"}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{tournament.totalPoints}</div>
                            <div className="text-sm text-muted-foreground">
                              ⌀ {tournament.averagePoints.toFixed(1)} Punkte/Runde
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Beste: {tournament.bestPosition}. | Schlechteste: {tournament.worstPosition}.
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts">
            <PlayerPerformanceChart rounds={rounds} playerName={playerName} />
          </TabsContent>

          <TabsContent value="achievements">
            <PlayerAchievements rounds={rounds} playerName={playerName} totalStats={totalStats} />
          </TabsContent>

          <TabsContent value="rounds">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Rundenverlauf ({rounds.length} Runden)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rounds.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Noch keine Runden gespielt</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rounds.map((round, index) => (
                      <div key={index} className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${round.position === 1 ? 'bg-tournament-gold text-black' :
                              round.position === 2 ? 'bg-tournament-silver text-black' :
                              round.position === 3 ? 'bg-tournament-bronze text-white' :
                              'bg-muted text-muted-foreground'
                            }
                          `}>
                            {round.position}
                          </div>
                          <div>
                            <h4 className="font-medium">{round.trackName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {round.tournamentName} - Runde {round.roundNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{round.points}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(round.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};