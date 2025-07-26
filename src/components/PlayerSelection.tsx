import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Play } from "lucide-react";

interface Player {
  id: string;
  name: string;
}

interface PlayerSelectionProps {
  onStartTournament: (selectedPlayers: Player[]) => void;
}

const AVAILABLE_PLAYERS: Player[] = [
  { id: "1", name: "Max Mustermann" },
  { id: "2", name: "Anna Schmidt" },
  { id: "3", name: "Tom Weber" },
  { id: "4", name: "Lisa Mueller" },
  { id: "5", name: "Jan Becker" },
  { id: "6", name: "Sara Klein" },
  { id: "7", name: "Lukas Wagner" },
  { id: "8", name: "Emma Fischer" },
];

export const PlayerSelection = ({ onStartTournament }: PlayerSelectionProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const isSelected = (playerId: string) => 
    selectedPlayers.some(p => p.id === playerId);

  const handleStartTournament = () => {
    if (selectedPlayers.length >= 3) {
      onStartTournament(selectedPlayers);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Spielerauswahl
            </CardTitle>
            <p className="text-muted-foreground">
              Wählen Sie die Spieler aus, die am heutigen Turnier teilnehmen
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {AVAILABLE_PLAYERS.map((player) => (
                <Button
                  key={player.id}
                  variant={isSelected(player.id) ? "default" : "outline"}
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => togglePlayer(player)}
                >
                  {player.name}
                </Button>
              ))}
            </div>

            {selectedPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  Ausgewählte Spieler ({selectedPlayers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player) => (
                    <Badge key={player.id} variant="secondary" className="text-sm">
                      {player.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleStartTournament}
                disabled={selectedPlayers.length < 3}
                className="px-8 py-3 text-lg"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Turnier starten
                {selectedPlayers.length < 3 && (
                  <span className="ml-2 text-sm opacity-75">
                    (min. 3 Spieler)
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};