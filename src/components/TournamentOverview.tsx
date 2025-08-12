import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Users, Play, Eye, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TournamentList } from "./TournamentList";

interface Tournament {
  id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
  player_count: number;
  rounds_count: number;
}

interface TournamentDetail {
  id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
  players: Array<{ id: string; name: string; totalPoints: number }>;
  rounds: Array<{
    id: string;
    round_number: number;
    track_name: string;
    track_number: string;
    creator: string;
    results: Array<{ player_name: string; position: number; points: number }>;
  }>;
}

interface TournamentOverviewProps {
  onBack: () => void;
  currentTournamentId: string | null;
  onContinueTournament: (tournamentId: string) => void;
  onDeleteTournament?: (tournamentId: string) => void;
}

export const TournamentOverview = ({ onBack, currentTournamentId, onContinueTournament, onDeleteTournament }: TournamentOverviewProps) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [tournamentDetail, setTournamentDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      setSelectedTournamentId(tournamentId);

      // Lade Turnier-Details
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Lade alle Round Results für dieses Turnier mit Spielerinformationen
      const { data: allRoundResults, error: resultsError } = await supabase
        .from('round_results')
        .select(`
          points,
          player_id,
          players!inner(id, name),
          rounds!inner(tournament_id)
        `)
        .eq('rounds.tournament_id', tournamentId);

      if (resultsError) throw resultsError;

      // Lade Runden mit Ergebnissen
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id,
          round_number,
          track_name,
          track_number,
          creator,
          round_results(
            position,
            points,
            players(name)
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number');

      if (roundsError) throw roundsError;

      // Sammle alle einzigartigen Spieler die tatsächlich Rundenergebnisse haben
      const uniquePlayers = new Map();
      allRoundResults?.forEach((result: any) => {
        const playerId = result.player_id;
        const playerName = result.players.name;
        if (!uniquePlayers.has(playerId)) {
          uniquePlayers.set(playerId, { id: playerId, name: playerName });
        }
      });

      // Berechne Spieler-Gesamtpunkte
      const playerTotals = Array.from(uniquePlayers.values()).reduce((acc: any, player: any) => {
        const playerId = player.id;
        const playerName = player.name;
        
        // Berechne Gesamtpunkte für diesen Spieler
        const totalPoints = allRoundResults
          ?.filter(result => result.player_id === playerId)
          ?.reduce((sum: number, result: any) => sum + result.points, 0) || 0;
        
        acc[playerId] = { id: playerId, name: playerName, totalPoints };
        return acc;
      }, {}) || {};

      const tournamentDetailData: TournamentDetail = {
        id: tournament.id,
        name: tournament.name,
        created_at: tournament.created_at,
        completed_at: tournament.completed_at,
        players: (Object.values(playerTotals) as Array<{ id: string; name: string; totalPoints: number }>).sort((a, b) => b.totalPoints - a.totalPoints),
        rounds: rounds?.map(round => ({
          id: round.id,
          round_number: round.round_number,
          track_name: round.track_name,
          track_number: round.track_number,
          creator: round.creator,
          results: round.round_results.map((result: any) => ({
            player_name: result.players.name,
            position: result.position,
            points: result.points
          })).sort((a: any, b: any) => a.position - b.position)
        })) || []
      };

      setTournamentDetail(tournamentDetailData);
      setView('detail');
    } catch (error) {
      console.error('Fehler beim Laden der Turnier-Details:', error);
      toast({
        title: "Fehler",
        description: "Turnier-Details konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedTournamentId(null);
    setTournamentDetail(null);
  };

  if (view === 'list') {
    return (
      <TournamentList 
        onBack={onBack}
        onSelectTournament={handleSelectTournament}
        currentTournamentId={currentTournamentId}
        onContinueTournament={onContinueTournament}
        onDeleteTournament={onDeleteTournament}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Turnier-Details...</p>
        </div>
      </div>
    );
  }

  if (!tournamentDetail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Turnier nicht gefunden</p>
          <Button onClick={handleBackToList} className="mt-4">Zurück zur Liste</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={handleBackToList} variant="outline" size="sm" className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {tournamentDetail.name}
            </h1>
            <p className="text-muted-foreground text-lg">
              Turnier-Details • {new Date(tournamentDetail.created_at).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant={tournamentDetail.completed_at ? "outline" : "default"} className="text-lg px-3 py-1">
              {tournamentDetail.completed_at ? "Abgeschlossen" : "Laufend"}
            </Badge>
          </div>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{tournamentDetail.players.length}</div>
              <p className="text-sm text-muted-foreground">Spieler</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary">{tournamentDetail.rounds.length}</div>
              <p className="text-sm text-muted-foreground">Runden</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">
                {tournamentDetail.completed_at 
                  ? new Date(tournamentDetail.completed_at).toLocaleDateString('de-DE')
                  : "Läuft noch"
                }
              </div>
              <p className="text-sm text-muted-foreground">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Final Standings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Endstand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tournamentDetail.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`
                    flex items-center justify-between p-4 rounded-lg border
                    ${index < 3 ? 'border-2' : ''} 
                    ${index === 0 ? 'border-tournament-gold bg-tournament-gold/10' : 
                      index === 1 ? 'border-tournament-silver bg-tournament-silver/10' : 
                      index === 2 ? 'border-tournament-bronze bg-tournament-bronze/10' : ''
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-tournament-gold text-black' :
                        index === 1 ? 'bg-tournament-silver text-black' :
                        index === 2 ? 'bg-tournament-bronze text-white' :
                        'bg-muted text-muted-foreground'
                      }
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{player.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {index === 0 ? '🏆 Sieger' : 
                         index === 1 ? '🥈 Zweiter Platz' :
                         index === 2 ? '🥉 Dritter Platz' : 
                         `${index + 1}. Platz`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{player.totalPoints}</div>
                    <div className="text-sm text-muted-foreground">Punkte</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rounds Details */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Rundendetails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tournamentDetail.rounds.map((round) => {
                const topThree = round.results.slice(0, 3);
                const winner = round.results[0];
                
                return (
                  <div key={round.id} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-semibold text-lg">
                        Runde {round.round_number}: {winner?.player_name || 'Unbekannt'}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topThree.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            // Create modal content for round details
                            const modalContent = `
                              <div class="space-y-4">
                                <h3 class="text-lg font-semibold">Runde ${round.round_number} - Komplette Rangliste</h3>
                                <p class="text-sm text-muted-foreground">Ersteller: ${round.creator} • Nummer: ${round.track_number}</p>
                                <div class="space-y-2">
                                  ${round.results.map((r, i) => `
                                    <div class="flex justify-between items-center p-2 rounded ${i < 3 ? 'bg-accent/20' : 'bg-muted/10'}">
                                      <span>${r.position}. ${r.player_name}</span>
                                      <span class="font-medium">${r.points} Punkte</span>
                                    </div>
                                  `).join('')}
                                </div>
                              </div>
                            `;
                            
                            // Simple alert for now - could be enhanced with a proper modal
                            const detailsText = round.results.map((r, i) => `${r.position}. ${r.player_name} (${r.points}P)`).join('\n');
                            alert(`Runde ${round.round_number} - Komplette Rangliste\n\nErsteller: ${round.creator}\nNummer: ${round.track_number}\n\n${detailsText}`);
                          }}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                            ${index === 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' :
                              index === 1 ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' :
                              'bg-accent text-accent-foreground hover:bg-accent/90'
                            }
                          `}
                        >
                          {result.position}. {result.player_name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};