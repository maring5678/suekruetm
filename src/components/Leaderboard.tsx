import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Plus, Users, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface PlayerScore {
  player: Player;
  totalPoints: number;
  roundResults: {
    round: number;
    track: string;
    position: number;
    points: number;
  }[];
}

interface LeaderboardProps {
  playerScores: PlayerScore[];
  currentRound: number;
  selectedPlayers: Player[];
  onNextRound: () => void;
  onEndTournament: () => void;
  onPlayersChange: (players: Player[]) => void;
}

export const Leaderboard = ({ 
  playerScores, 
  currentRound,
  selectedPlayers,
  onNextRound, 
  onEndTournament,
  onPlayersChange
}: LeaderboardProps) => {
  const [showPlayerEditor, setShowPlayerEditor] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [tempSelectedPlayers, setTempSelectedPlayers] = useState<Player[]>(selectedPlayers);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (showPlayerEditor) {
      loadAvailablePlayers();
    }
  }, [showPlayerEditor]);

  const loadAvailablePlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Spieler:', error);
      toast({
        title: "Fehler",
        description: "Spieler konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (player: Player) => {
    setTempSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const isSelected = (playerId: string) => 
    tempSelectedPlayers.some(p => p.id === playerId);

  const handleSavePlayerChanges = () => {
    if (tempSelectedPlayers.length >= 2) {
      onPlayersChange(tempSelectedPlayers);
      setShowPlayerEditor(false);
      toast({
        title: "Teilnehmer aktualisiert",
        description: `${tempSelectedPlayers.length} Spieler für die nächste Runde ausgewählt.`
      });
    }
  };

  const handleCancelPlayerEdit = () => {
    setTempSelectedPlayers(selectedPlayers);
    setShowPlayerEditor(false);
  };
  const sortedScores = [...playerScores].sort((a, b) => b.totalPoints - a.totalPoints);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Zwischenstand nach Runde {currentRound - 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedScores.map((score, index) => (
                <Card key={score.player.id} className={`${index < 3 ? 'border-2' : ''} ${
                  index === 0 ? 'border-tournament-gold' : 
                  index === 1 ? 'border-tournament-silver' : 
                  index === 2 ? 'border-tournament-bronze' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRankIcon(index + 1)}
                        <div>
                          <h3 className="font-semibold text-lg">{score.player.name}</h3>
                          <Badge variant={getRankBadgeVariant(index + 1)}>
                            {score.totalPoints} Punkte
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Rundenergebnisse:</p>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {score.roundResults.map((result) => (
                            <Badge key={result.round} variant="outline" className="text-xs">
                              R{result.round}: {result.points}P
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Rundendetails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(new Set(playerScores.flatMap(p => p.roundResults.map(r => r.round)))).map(roundNum => {
                const roundData = playerScores[0]?.roundResults.find(r => r.round === roundNum);
  if (showPlayerEditor) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Teilnehmer für Runde {currentRound} bearbeiten
              </CardTitle>
              <p className="text-muted-foreground">
                Wählen Sie die Spieler aus, die an der nächsten Runde teilnehmen
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Lade Spieler...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availablePlayers.map((player) => (
                      <Button
                        key={player.id}
                        variant={isSelected(player.id) ? "default" : "outline"}
                        className="h-auto p-4 text-left justify-start"
                        onClick={() => togglePlayer(player)}
                      >
                        {isSelected(player.id) && <Check className="h-4 w-4 mr-2" />}
                        {player.name}
                      </Button>
                    ))}
                  </div>

                  {tempSelectedPlayers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">
                        Ausgewählte Spieler ({tempSelectedPlayers.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {tempSelectedPlayers.map((player) => (
                          <Badge key={player.id} variant="secondary" className="text-sm">
                            {player.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-4 pt-4">
                    <Button
                      onClick={handleCancelPlayerEdit}
                      variant="outline"
                      size="lg"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleSavePlayerChanges}
                      disabled={tempSelectedPlayers.length < 2}
                      size="lg"
                    >
                      Bestätigen ({tempSelectedPlayers.length} Spieler)
                      {tempSelectedPlayers.length < 2 && (
                        <span className="ml-2 text-sm opacity-75">
                          (min. 2 Spieler)
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
                  <div key={roundNum} className="border rounded-lg p-3">
                    <h4 className="font-medium">Runde {roundNum}: {roundData?.track}</h4>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[1, 2, 3].map(position => {
                        const playerResult = playerScores.find(p => 
                          p.roundResults.some(r => r.round === roundNum && r.position === position)
                        );
                        if (!playerResult) return null;
                        
                        return (
                          <div key={position} className="text-sm">
                            <Badge variant={position === 1 ? "default" : position === 2 ? "secondary" : "outline"}>
                              {position}. {playerResult.player.name}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => setShowPlayerEditor(true)} 
            variant="outline" 
            size="lg" 
            className="px-6"
          >
            <Users className="h-5 w-5 mr-2" />
            Teilnehmer bearbeiten
          </Button>
          <Button onClick={onNextRound} size="lg" className="px-8">
            <Plus className="h-5 w-5 mr-2" />
            Nächste Runde
          </Button>
          <Button onClick={onEndTournament} variant="outline" size="lg">
            Turnier beenden
          </Button>
        </div>
      </div>
    </div>
  );
};