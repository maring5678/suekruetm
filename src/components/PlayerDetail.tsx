import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, TrendingUp, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        .eq('player_id', playerId)
        .order('rounds.tournaments.created_at', { ascending: false });

      if (roundError) throw roundError;

      // Lade historische Daten
      const { data: historicalData } = await supabase
        .from('historical_player_totals')
        .select('total_points, tournaments_played')
        .eq('player_name', playerName)
        .maybeSingle();

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
          tournamentMap.set(tournamentId, {
            id: tournamentId,
            name: tournament.name,
            createdAt: tournament.created_at,
            completedAt: tournament.completed_at,
            totalPoints: 0,
            roundsPlayed: 0,
            averagePoints: 0,
            bestPosition: Infinity,
            worstPosition: 0
          });
        }

        const tournamentDetail = tournamentMap.get(tournamentId)!;
        tournamentDetail.totalPoints += result.points;
        tournamentDetail.roundsPlayed += 1;
        tournamentDetail.bestPosition = Math.min(tournamentDetail.bestPosition, result.position);
        tournamentDetail.worstPosition = Math.max(tournamentDetail.worstPosition, result.position);
        tournamentDetail.averagePoints = tournamentDetail.totalPoints / tournamentDetail.roundsPlayed;
      });

      const tournamentList = Array.from(tournamentMap.values());

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
                  <div key={tournament.id} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{tournament.name}</h3>
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

        {/* Rundenverlauf */}
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
      </div>
    </div>
  );
};