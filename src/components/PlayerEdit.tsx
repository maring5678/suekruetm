import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
}

interface PlayerEditProps {
  currentRound: number;
  selectedPlayers: Player[];
  onPlayersConfirmed: (players: Player[]) => void;
}

export function PlayerEdit({ currentRound, selectedPlayers, onPlayersConfirmed }: PlayerEditProps) {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [tempSelectedPlayers, setTempSelectedPlayers] = useState<Player[]>(selectedPlayers);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailablePlayers();
  }, []);

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

  const handleConfirm = () => {
    if (tempSelectedPlayers.length >= 2) {
      onPlayersConfirmed(tempSelectedPlayers);
      toast({
        title: "Teilnehmer bestätigt",
        description: `${tempSelectedPlayers.length} Spieler für Runde ${currentRound} ausgewählt.`
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lade Spieler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Teilnehmer für Runde {currentRound}
            </CardTitle>
            <p className="text-muted-foreground">
              Wählen Sie die Spieler aus, die an Runde {currentRound} teilnehmen
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleConfirm}
                disabled={tempSelectedPlayers.length < 2}
                size="lg"
                className="px-8"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                {tempSelectedPlayers.length >= 2 
                  ? `Zur Rundeneingabe (${tempSelectedPlayers.length} Spieler)` 
                  : `Mindestens 2 Spieler auswählen (${tempSelectedPlayers.length}/2)`
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}