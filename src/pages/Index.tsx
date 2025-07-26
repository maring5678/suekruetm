import { useState } from "react";
import { PlayerSelection } from "@/components/PlayerSelection";
import { RoundInput } from "@/components/RoundInput";
import { Leaderboard } from "@/components/Leaderboard";
import { TournamentComplete } from "@/components/TournamentComplete";

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

type GameState = "player-selection" | "round-input" | "leaderboard" | "tournament-complete";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("player-selection");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);

  const handleStartTournament = (players: Player[]) => {
    setSelectedPlayers(players);
    setPlayerScores(players.map(player => ({
      player,
      totalPoints: 0,
      roundResults: []
    })));
    setGameState("round-input");
  };

  const handleRoundComplete = (trackName: string, rankings: Player[]) => {
    const pointsMap = { 1: 3, 2: 2, 3: 1 };
    
    setPlayerScores(prev => prev.map(playerScore => {
      const rankIndex = rankings.findIndex(p => p.id === playerScore.player.id);
      const position = rankIndex + 1;
      const points = position <= 3 ? pointsMap[position as keyof typeof pointsMap] : 0;
      
      return {
        ...playerScore,
        totalPoints: playerScore.totalPoints + points,
        roundResults: [
          ...playerScore.roundResults,
          {
            round: currentRound,
            track: trackName,
            position,
            points
          }
        ]
      };
    }));
    
    setCurrentRound(prev => prev + 1);
    setGameState("leaderboard");
  };

  const handleNextRound = () => {
    setGameState("round-input");
  };

  const handleEndTournament = () => {
    setGameState("tournament-complete");
  };

  const handleNewTournament = () => {
    setGameState("player-selection");
    setSelectedPlayers([]);
    setCurrentRound(1);
    setPlayerScores([]);
  };

  switch (gameState) {
    case "player-selection":
      return <PlayerSelection onStartTournament={handleStartTournament} />;
    
    case "round-input":
      return (
        <RoundInput
          roundNumber={currentRound}
          players={selectedPlayers}
          onRoundComplete={handleRoundComplete}
        />
      );
    
    case "leaderboard":
      return (
        <Leaderboard
          playerScores={playerScores}
          currentRound={currentRound}
          onNextRound={handleNextRound}
          onEndTournament={handleEndTournament}
        />
      );
    
    case "tournament-complete":
      return (
        <TournamentComplete
          playerScores={playerScores}
          onNewTournament={handleNewTournament}
        />
      );
    
    default:
      return null;
  }
};

export default Index;
