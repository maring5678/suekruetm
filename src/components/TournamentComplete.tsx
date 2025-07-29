import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, RotateCcw, Crown, ArrowLeft } from "lucide-react";

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

interface TournamentCompleteProps {
  playerScores: PlayerScore[];
  onNewTournament: () => void;
  onPlayerClick?: (playerId: string, playerName: string) => void;
  onBack?: () => void;
}

export const TournamentComplete = ({ playerScores, onNewTournament, onPlayerClick, onBack }: TournamentCompleteProps) => {
  const sortedScores = [...playerScores].sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-8 w-8 text-tournament-gold" />;
      case 2: return <Medal className="h-7 w-7 text-tournament-silver" />;
      case 3: return <Award className="h-6 w-6 text-tournament-bronze" />;
      default: return <span className="w-8 h-8 flex items-center justify-center text-lg font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const totalRounds = Math.max(...playerScores.flatMap(p => p.roundResults.map(r => r.round)));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {onBack && (
          <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        )}
        <Card className="border-2 border-primary">
          <CardHeader className="text-center bg-primary/5">
            <CardTitle className="text-4xl font-bold flex items-center justify-center gap-3">
              <Trophy className="h-10 w-10 text-tournament-gold" />
              Turnier beendet!
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              Herzlichen Glückwunsch an alle Teilnehmer!
            </p>
          </CardHeader>
        </Card>

        <div className="grid gap-4">
          {sortedScores.map((score, index) => (
            <Card 
              key={score.player.id} 
              className={`relative overflow-hidden transition-all duration-200 ${
                index === 0 ? 'border-2 border-tournament-gold bg-gradient-to-r from-tournament-gold/10 to-transparent' :
                index === 1 ? 'border-2 border-tournament-silver bg-gradient-to-r from-tournament-silver/10 to-transparent' :
                index === 2 ? 'border-2 border-tournament-bronze bg-gradient-to-r from-tournament-bronze/10 to-transparent' :
                'border border-border'
              } ${onPlayerClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : ''}`}
              onClick={() => onPlayerClick?.(score.player.id, score.player.name)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getRankIcon(index + 1)}
                    <div>
                      <h3 className={`font-bold ${index === 0 ? 'text-2xl' : index < 3 ? 'text-xl' : 'text-lg'}`}>
                        {score.player.name}
                        {index === 0 && <span className="ml-2">🏆</span>}
                      </h3>
                      <Badge 
                        variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}
                        className={index === 0 ? "text-lg px-3 py-1" : ""}
                      >
                        {score.totalPoints} Punkte gesamt
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-2">
                      Platz {index + 1} von {sortedScores.length}
                    </p>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {score.roundResults.map((result) => (
                        <Badge key={result.round} variant="outline" className="text-xs">
                          R{result.round}: {result.points}P (P{result.position})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Turnier-Statistiken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Anzahl Runden:</strong> {totalRounds}</p>
                <p><strong>Teilnehmer:</strong> {playerScores.length}</p>
              </div>
              <div>
                <p><strong>Höchste Punktzahl:</strong> {sortedScores[0]?.totalPoints || 0}</p>
                <p><strong>Durchschnitt:</strong> {Math.round(playerScores.reduce((sum, p) => sum + p.totalPoints, 0) / playerScores.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-6">
          <Button onClick={onNewTournament} size="lg" className="px-8 py-3 text-lg">
            <RotateCcw className="h-5 w-5 mr-2" />
            Neues Turnier starten
          </Button>
        </div>
      </div>
    </div>
  );
};