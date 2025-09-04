import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Plus, User, ArrowLeft, BarChart3 } from "lucide-react";
import { TournamentAnalytics } from "@/components/charts/TournamentAnalytics";

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
  onBack?: () => void;
}

export const Leaderboard = ({ 
  playerScores, 
  currentRound,
  onNextRound, 
  onEndTournament,
  onPlayerClick,
  onBack
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
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 mobile-safe">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {onBack && (
          <Button onClick={onBack} variant="outline" size="sm" className="shadow-sm touch-target text-xs sm:text-sm">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Zurück</span>
          </Button>
        )}
        <Card>
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-center">Zwischenstand nach Runde {currentRound - 1}</span>
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
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">{getRankIcon(index + 1)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base sm:text-lg truncate">{score.player.name}</h3>
                            {onPlayerClick && (
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <Badge variant={getRankBadgeVariant(index + 1)} className="text-xs sm:text-sm">
                            {score.totalPoints} Punkte
                          </Badge>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Rundenergebnisse:</p>
                        <div className="flex gap-1 flex-wrap justify-start sm:justify-end">
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

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Rundendetails</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
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
          </TabsContent>

          <TabsContent value="analytics">
            <TournamentAnalytics playerScores={playerScores} currentRound={currentRound} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
          <Button onClick={onNextRound} size="lg" className="px-6 sm:px-8 touch-target w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Nächste Runde
          </Button>
          <Button onClick={onEndTournament} variant="outline" size="lg" className="touch-target w-full sm:w-auto">
            Turnier beenden
          </Button>
        </div>
      </div>
    </div>
  );
};