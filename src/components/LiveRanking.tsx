import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Users, Activity, ArrowLeft, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlayerRanking {
  id: string;
  name: string;
  totalPoints: number;
  roundsPlayed: number;
  averagePoints: number;
  lastPosition: number | null;
  trend: 'up' | 'down' | 'stable';
}

interface LiveTournamentRanking {
  id: string;
  name: string;
  currentRound: number;
  players: PlayerRanking[];
  lastUpdate: string;
}

interface LiveRankingProps {
  onBack?: () => void;
  currentTournamentId?: string | null;
}

export const LiveRanking = ({ onBack, currentTournamentId }: LiveRankingProps) => {
  const [globalRanking, setGlobalRanking] = useState<PlayerRanking[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<LiveTournamentRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRankings();
    
    // Set up real-time updates for active tournaments
    const channel = supabase
      .channel('live-ranking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_results'
        },
        () => {
          loadRankings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        () => {
          loadRankings();
        }
      )
      .subscribe();

    // Fallback: Update every 10 seconds
    const interval = setInterval(loadRankings, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadRankings = async () => {
    try {
      await Promise.all([loadGlobalRanking(), loadLiveTournamentRankings()]);
    } catch (error) {
      console.error('Fehler beim Laden der Rankings:', error);
      toast({
        title: "Fehler",
        description: "Rankings konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalRanking = async () => {
    // Lade historische Gesamtpunkte
    const { data: historicalData, error: historicalError } = await supabase
      .from('historical_player_totals')
      .select('*')
      .order('total_points', { ascending: false });

    if (historicalError) throw historicalError;

    const globalPlayers = historicalData?.map((player, index) => ({
      id: player.id,
      name: player.player_name,
      totalPoints: player.total_points || 0,
      roundsPlayed: player.tournaments_played || 0,
      averagePoints: player.tournaments_played > 0 ? 
        Math.round((player.total_points / player.tournaments_played) * 10) / 10 : 0,
      lastPosition: null,
      trend: 'stable' as const
    })) || [];

    setGlobalRanking(globalPlayers);
  };

  const loadLiveTournamentRankings = async () => {
    // Lade aktive Turniere
    const { data: activeTournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*')
      .is('completed_at', null)
      .order('created_at', { ascending: false });

    if (tournamentsError) throw tournamentsError;

    if (!activeTournaments || activeTournaments.length === 0) {
      setLiveTournaments([]);
      return;
    }

    const tournamentRankings = await Promise.all(
      activeTournaments.map(async (tournament) => {
        // Lade Spieler für dieses Turnier
        const { data: tournamentPlayers, error: playersError } = await supabase
          .from('tournament_players')
          .select('players(*)')
          .eq('tournament_id', tournament.id);

        if (playersError) throw playersError;

        // Lade Rundenergebnisse für dieses Turnier
        const { data: roundResults, error: resultsError } = await supabase
          .from('round_results')
          .select(`
            player_id,
            points,
            position,
            rounds!inner(
              tournament_id,
              round_number,
              created_at
            )
          `)
          .eq('rounds.tournament_id', tournament.id);

        if (resultsError) throw resultsError;

        // Berechne aktuelle Runde
        const maxRound = roundResults?.reduce((max, result) => 
          Math.max(max, result.rounds?.round_number || 0), 0
        ) || 0;

        // Berechne Spieler-Rankings
        const playerRankings = tournamentPlayers?.map(tp => {
          const player = tp.players;
          if (!player) return null;

          const playerResults = roundResults?.filter(r => r.player_id === player.id) || [];
          const totalPoints = playerResults.reduce((sum, r) => sum + (r.points || 0), 0);
          
          // Letzter Platz in der neuesten Runde
          const latestResult = playerResults
            .sort((a, b) => (b.rounds?.round_number || 0) - (a.rounds?.round_number || 0))[0];

          return {
            id: player.id,
            name: player.name,
            totalPoints,
            roundsPlayed: playerResults.length,
            averagePoints: playerResults.length > 0 ? 
              Math.round((totalPoints / playerResults.length) * 10) / 10 : 0,
            lastPosition: latestResult?.position || null,
            trend: 'stable' as const
          };
        }).filter(Boolean) as PlayerRanking[];

        // Sortiere nach Gesamtpunkten
        playerRankings.sort((a, b) => b.totalPoints - a.totalPoints);

        return {
          id: tournament.id,
          name: tournament.name,
          currentRound: maxRound,
          players: playerRankings,
          lastUpdate: new Date().toISOString()
        };
      })
    );

    setLiveTournaments(tournamentRankings);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-tournament-gold" />;
      case 2: return <Medal className="h-5 w-5 text-tournament-silver" />;
      case 3: return <Award className="h-5 w-5 text-tournament-bronze" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1: return "default";
      case 2: return "secondary";
      case 3: return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Live-Rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          )}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Live Rankings
            </h1>
            <p className="text-muted-foreground text-lg">
              Echtzeit-Ranglisten • Aktualisiert automatisch
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant="default" className="text-lg px-3 py-1 bg-green-500 hover:bg-green-600">
              <Activity className="h-4 w-4 mr-2" />
              Live
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="live-tournaments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live-tournaments" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Live Turniere
            </TabsTrigger>
            <TabsTrigger value="global-ranking" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gesamt-Ranking
            </TabsTrigger>
          </TabsList>

          {/* Live Tournaments Tab */}
          <TabsContent value="live-tournaments" className="space-y-6">
            {liveTournaments.length === 0 ? (
              <Card className="text-center p-8">
                <CardContent className="space-y-4">
                  <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
                  <h3 className="text-xl font-semibold">Keine aktiven Turniere</h3>
                  <p className="text-muted-foreground">
                    Starte ein neues Turnier, um es hier im Live-Ranking zu sehen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              liveTournaments.map((tournament) => (
                <Card key={tournament.id} className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span>{tournament.name}</span>
                        {tournament.id === currentTournamentId && (
                          <Badge variant="default">Dein Turnier</Badge>
                        )}
                      </div>
                      <Badge variant="outline">
                        Runde {tournament.currentRound}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tournament.players.map((player, index) => (
                        <div 
                          key={player.id}
                          className={`
                            flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                            ${index < 3 ? 'border-2' : ''}
                            ${index === 0 ? 'border-tournament-gold bg-tournament-gold/10' :
                              index === 1 ? 'border-tournament-silver bg-tournament-silver/10' :
                              index === 2 ? 'border-tournament-bronze bg-tournament-bronze/10' :
                              'border-border'
                            }
                          `}
                        >
                          <div className="flex items-center gap-4">
                            {getRankIcon(index + 1)}
                            <div>
                              <h4 className="font-semibold">{player.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{player.roundsPlayed} Runden gespielt</span>
                                {player.lastPosition && (
                                  <Badge variant="outline" className="text-xs">
                                    Letzter Platz: {player.lastPosition}.
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {player.totalPoints}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Ø {player.averagePoints} pro Runde
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Global Ranking Tab */}
          <TabsContent value="global-ranking" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Gesamt-Ranking aller Spieler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalRanking.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Noch keine Spielerdaten vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {globalRanking.map((player, index) => (
                      <div 
                        key={player.id}
                        className={`
                          flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                          ${index < 3 ? 'border-2' : ''}
                          ${index === 0 ? 'border-tournament-gold bg-tournament-gold/10' :
                            index === 1 ? 'border-tournament-silver bg-tournament-silver/10' :
                            index === 2 ? 'border-tournament-bronze bg-tournament-bronze/10' :
                            'border-border'
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
                          {getRankIcon(index + 1)}
                          <div>
                            <h4 className="font-semibold">{player.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{player.roundsPlayed} Turniere</span>
                              <span>Ø {player.averagePoints} Punkte/Turnier</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {player.totalPoints}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Gesamtpunkte
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