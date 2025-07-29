import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Plus, User } from "lucide-react";

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
  onNextRound: () => void;
  onEndTournament: () => void;
  onPlayerClick?: (playerId: string, playerName: string) => void;
}

export const Leaderboard = ({ 
  playerScores, 
  currentRound,
  onNextRound, 
  onEndTournament,
  onPlayerClick
}: LeaderboardProps) => {
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
                <Card 
                  key={score.player.id} 
                  className={`
                    ${index < 3 ? 'border-2' : ''} 
                    ${index === 0 ? 'border-tournament-gold' : 
                      index === 1 ? 'border-tournament-silver' : 
                      index === 2 ? 'border-tournament-bronze' : ''
                    }
                    ${onPlayerClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200' : ''}
                  `}
                  onClick={() => onPlayerClick?.(score.player.id, score.player.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRankIcon(index + 1)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{score.player.name}</h3>
                            {onPlayerClick && (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
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
              
              {/* Vollständige Rangliste für alle Spieler */}
              {playerScores.length > sortedScores.length && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Vollständige Rangliste</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {playerScores
                        .sort((a, b) => b.totalPoints - a.totalPoints)
                        .map((score, index) => (
                          <div 
                            key={score.player.id} 
                            className={`
                              flex items-center justify-between p-3 rounded-lg border
                              ${onPlayerClick ? 'cursor-pointer hover:bg-accent/5' : ''}
                            `}
                            onClick={() => onPlayerClick?.(score.player.id, score.player.name)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{score.player.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold">{score.totalPoints}</span>
                              <span className="text-muted-foreground ml-1">Punkte</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
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