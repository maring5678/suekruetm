import { useState, useCallback } from "react";

export type GameState = "player-selection" | "player-edit" | "round-input" | "leaderboard" | "tournament-complete" | "statistics" | "excel-import" | "player-detail" | "tournament-overview" | "live-ranking";

interface GameStateHistory {
  current: GameState;
  previous: GameState | null;
}

export const useGameState = (initialState: GameState = "player-selection") => {
  const [stateHistory, setStateHistory] = useState<GameStateHistory>({
    current: initialState,
    previous: null
  });

  const setGameState = useCallback((newState: GameState) => {
    setStateHistory(prev => ({
      current: newState,
      previous: prev.current
    }));
  }, []);

  const goBack = useCallback(() => {
    if (stateHistory.previous) {
      setStateHistory(prev => ({
        current: prev.previous!,
        previous: null // Reset previous to avoid deep history
      }));
    }
  }, [stateHistory.previous]);

  const resetState = useCallback(() => {
    setStateHistory({
      current: initialState,
      previous: null
    });
  }, [initialState]);

  return {
    gameState: stateHistory.current,
    previousState: stateHistory.previous,
    setGameState,
    goBack,
    resetState,
    canGoBack: stateHistory.previous !== null
  };
};