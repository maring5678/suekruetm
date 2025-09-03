import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Target, Zap, Crown, Star, TrendingUp } from "lucide-react";

interface RoundDetail {
  roundNumber: number;
  trackName: string;
  position: number;
  points: number;
  tournamentName: string;
  date: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'legendary';
  progress?: { current: number; max: number };
}

interface PlayerAchievementsProps {
  rounds: RoundDetail[];
  playerName: string;
  totalStats: {
    totalPoints: number;
    tournamentsPlayed: number;
    roundsPlayed: number;
    averagePointsPerRound: number;
    bestTournament: number;
    winRate: number;
  };
}

export const PlayerAchievements = ({ rounds, playerName, totalStats }: PlayerAchievementsProps) => {
  const calculateAchievements = (): Achievement[] => {
    const firstPlaces = rounds.filter(r => r.position === 1).length;
    const secondPlaces = rounds.filter(r => r.position === 2).length;
    const thirdPlaces = rounds.filter(r => r.position === 3).length;
    const podiumFinishes = firstPlaces + secondPlaces + thirdPlaces;
    const consecutiveWins = getConsecutiveWins();
    const perfectStreak = getPerfectStreak();
    const highestScore = Math.max(...rounds.map(r => r.points), 0);

    return [
      // Grundlegende Achievements
      {
        id: 'first_win',
        title: 'Erster Sieg',
        description: 'Gewinne deine erste Runde',
        icon: <Trophy className="h-5 w-5" />,
        unlocked: firstPlaces > 0,
        rarity: 'common'
      },
      {
        id: 'podium_master',
        title: 'Podium Master',
        description: 'Erreiche 10 Podiumsplätze',
        icon: <Medal className="h-5 w-5" />,
        unlocked: podiumFinishes >= 10,
        rarity: 'rare',
        progress: { current: Math.min(podiumFinishes, 10), max: 10 }
      },
      {
        id: 'champion',
        title: 'Champion',
        description: 'Gewinne 5 Runden',
        icon: <Crown className="h-5 w-5" />,
        unlocked: firstPlaces >= 5,
        rarity: 'rare',
        progress: { current: Math.min(firstPlaces, 5), max: 5 }
      },
      {
        id: 'legend',
        title: 'Legende',
        description: 'Gewinne 15 Runden',
        icon: <Star className="h-5 w-5" />,
        unlocked: firstPlaces >= 15,
        rarity: 'legendary',
        progress: { current: Math.min(firstPlaces, 15), max: 15 }
      },
      
      // Spezielle Achievements
      {
        id: 'hat_trick',
        title: 'Hattrick',
        description: 'Gewinne 3 Runden in Folge',
        icon: <Zap className="h-5 w-5" />,
        unlocked: consecutiveWins >= 3,
        rarity: 'rare'
      },
      {
        id: 'perfect_streak',
        title: 'Perfekte Serie',
        description: 'Erreiche 5 Podiumsplätze in Folge',
        icon: <Target className="h-5 w-5" />,
        unlocked: perfectStreak >= 5,
        rarity: 'legendary'
      },
      {
        id: 'high_scorer',
        title: 'High Scorer',
        description: 'Erreiche 100+ Punkte in einer Runde',
        icon: <TrendingUp className="h-5 w-5" />,
        unlocked: highestScore >= 100,
        rarity: 'rare'
      },
      {
        id: 'marathon_runner',
        title: 'Marathon-Läufer',
        description: 'Spiele 50 Runden',
        icon: <Award className="h-5 w-5" />,
        unlocked: totalStats.roundsPlayed >= 50,
        rarity: 'common',
        progress: { current: Math.min(totalStats.roundsPlayed, 50), max: 50 }
      },
      {
        id: 'point_collector',
        title: 'Punktesammler',
        description: 'Sammle 1000 Gesamtpunkte',
        icon: <Star className="h-5 w-5" />,
        unlocked: totalStats.totalPoints >= 1000,
        rarity: 'rare',
        progress: { current: Math.min(totalStats.totalPoints, 1000), max: 1000 }
      },
      {
        id: 'consistency_king',
        title: 'Konstanz-König',
        description: 'Erreiche eine Gewinnrate von 30%+',
        icon: <Crown className="h-5 w-5" />,
        unlocked: totalStats.winRate >= 30,
        rarity: 'legendary'
      }
    ];
  };

  const getConsecutiveWins = (): number => {
    let maxStreak = 0;
    let currentStreak = 0;
    
    const sortedRounds = rounds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const round of sortedRounds) {
      if (round.position === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  };

  const getPerfectStreak = (): number => {
    let maxStreak = 0;
    let currentStreak = 0;
    
    const sortedRounds = rounds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const round of sortedRounds) {
      if (round.position <= 3) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-secondary text-secondary-foreground';
      case 'rare': return 'bg-primary text-primary-foreground';
      case 'legendary': return 'bg-tournament-gold text-black';
    }
  };

  const getRarityName = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'Häufig';
      case 'rare': return 'Selten';
      case 'legendary': return 'Legendär';
    }
  };

  const achievements = calculateAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const progressAchievements = achievements.filter(a => !a.unlocked && a.progress);

  return (
    <div className="space-y-6">
      {/* Statistiken Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievement Fortschritt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{unlockedAchievements.length}</div>
              <div className="text-sm text-muted-foreground">Freigeschaltet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{achievements.length}</div>
              <div className="text-sm text-muted-foreground">Gesamt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-tournament-gold">
                {unlockedAchievements.filter(a => a.rarity === 'legendary').length}
              </div>
              <div className="text-sm text-muted-foreground">Legendär</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Abschluss</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Freigeschaltete Achievements */}
      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-primary" />
              Freigeschaltete Achievements ({unlockedAchievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedAchievements.map(achievement => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 border rounded-lg bg-accent/5">
                  <div className="flex-shrink-0 text-primary">
                    {achievement.icon}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{achievement.title}</h4>
                      <Badge className={getRarityColor(achievement.rarity)}>
                        {getRarityName(achievement.rarity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fortschrittsbehaftete Achievements */}
      {progressAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              In Arbeit ({progressAchievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressAchievements.map(achievement => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 text-muted-foreground">
                    {achievement.icon}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{achievement.title}</h4>
                      <Badge className={getRarityColor(achievement.rarity)}>
                        {getRarityName(achievement.rarity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.progress && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{achievement.progress.current} / {achievement.progress.max}</span>
                          <span>{Math.round((achievement.progress.current / achievement.progress.max) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(achievement.progress.current / achievement.progress.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};