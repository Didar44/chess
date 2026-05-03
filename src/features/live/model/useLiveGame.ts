import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Color } from "chess.js";
import type { useLocalChessGame } from "@/entities/game/model/useLocalChessGame";
import { useAuth } from "@/features/auth/model/auth-context";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  loadProfilesByIds,
  updateProfileRating,
} from "@/features/auth/lib/supabase";
import { savePersistedGame } from "@/features/history/lib/games";
import {
  getLiveChannelName,
  getLiveShareUrl,
  getOrCreateGuestIdentity,
  loadLiveGameRecord,
  upsertLiveGameRecord,
} from "@/features/live/lib/live-game";
import type {
  LiveMatchRecord,
  LivePresence,
  LiveRatingStatus,
  LiveSeat,
} from "@/features/live/model/types";
import {
  calculateNextRatings,
  getRatingOutcome,
} from "@/features/ratings/lib/ratings";

type GameState = ReturnType<typeof useLocalChessGame>;

type LiveMovePayload = {
  fen: string;
  moveCount: number;
  pgn: string;
  result: LiveMatchRecord["result"];
  senderKey: string;
  status: LiveMatchRecord["status"];
  uci: string;
};

type LiveSnapshotPayload = {
  fen: string;
  moveCount: number;
  pgn: string;
  result: LiveMatchRecord["result"];
  senderKey: string;
  status: LiveMatchRecord["status"];
};

type LiveStatus = "disabled" | "connecting" | "ready" | "error";

function getPresenceEntries(channel: RealtimeChannel): LiveSeat[] {
  const presenceState = channel.presenceState<LivePresence>();

  return Object.entries(presenceState)
    .flatMap(([presenceKey, entries]) =>
      entries.map((entry) => ({
        color: "w" as Color,
        isGuest: entry.isGuest,
        joinedAt: entry.joinedAt,
        name: entry.name,
        presenceKey,
      })),
    )
    .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
    .map((entry, index) => ({
      ...entry,
      color: (index === 0 ? "w" : "b") as Color,
    }))
    .slice(0, 2);
}

function getRecordStatus(input: {
  hasMoves: boolean;
  isGameOver: boolean;
  seats: LiveSeat[];
}) {
  if (input.isGameOver) {
    return "finished" as const;
  }

  if (input.seats.length > 1 || input.hasMoves) {
    return "active" as const;
  }

  return "waiting" as const;
}

function getLiveStatusForBoardState(input: {
  hasMoves: boolean;
  isGameOver: boolean;
}) {
  if (input.isGameOver) {
    return "finished" as const;
  }

  return input.hasMoves ? "active" as const : "waiting" as const;
}

export function useLiveGame(gameId: string | null, gameState: GameState) {
  const { profile, refreshProfile, sessionUser, status: authStatus } = useAuth();
  const [guestIdentity] = useState(() => getOrCreateGuestIdentity());
  const [assignedColor, setAssignedColor] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<LiveSeat[]>([]);
  const [ratingStatus, setRatingStatus] = useState<LiveRatingStatus>("idle");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [liveRecord, setLiveRecord] = useState<LiveMatchRecord | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const liveRecordRef = useRef<LiveMatchRecord | null>(null);
  const identity = useMemo(
    () =>
      sessionUser
        ? {
          key: sessionUser.id,
          name:
            profile?.displayName ?? sessionUser.email?.split("@")[0] ?? "Player",
        }
        : guestIdentity,
    [guestIdentity, profile?.displayName, sessionUser],
  );
  const identityRef = useRef(identity);
  const latestGameRef = useRef({
    fen: gameState.fen,
    history: gameState.history,
    isGameOver: gameState.isGameOver,
    pgn: gameState.pgn,
    result: gameState.result,
    turn: gameState.turn,
  });
  const loadPgnRef = useRef(gameState.actions.loadPgn);
  const applyUciMoveRef = useRef(gameState.actions.applyUciMove);
  const isIdentityReady = authStatus !== "loading";
  const isEnabled = Boolean(gameId && isSupabaseConfigured() && isIdentityReady);
  const shareUrl = useMemo(
    () => (gameId ? getLiveShareUrl(gameId) : null),
    [gameId],
  );
  const effectiveStatus = !isIdentityReady ? "connecting" : isEnabled ? status : "disabled";
  const lastBroadcastMoveCountRef = useRef(0);
  const lastAppliedRemoteMoveCountRef = useRef(0);
  const savedFinalHistoryRef = useRef(false);
  const ratedResultHandledRef = useRef(false);

  useEffect(() => {
    if (!gameId || !isEnabled) {
      setAssignedColor(null);
      setError(null);
      setPresence([]);
      setRatingStatus("idle");
      setStatus("connecting");
      setLiveRecord(null);
      lastBroadcastMoveCountRef.current = 0;
      lastAppliedRemoteMoveCountRef.current = 0;
      savedFinalHistoryRef.current = false;
      ratedResultHandledRef.current = false;
      return;
    }

    setAssignedColor(null);
    setError(null);
    setPresence([]);
    setRatingStatus("idle");
    setStatus("connecting");
    setLiveRecord(null);
    lastBroadcastMoveCountRef.current = 0;
    lastAppliedRemoteMoveCountRef.current = 0;
    savedFinalHistoryRef.current = false;
    ratedResultHandledRef.current = false;
  }, [gameId, isEnabled]);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    liveRecordRef.current = liveRecord;
  }, [liveRecord]);

  useEffect(() => {
    latestGameRef.current = {
      fen: gameState.fen,
      history: gameState.history,
      isGameOver: gameState.isGameOver,
      pgn: gameState.pgn,
      result: gameState.result,
      turn: gameState.turn,
    };
    loadPgnRef.current = gameState.actions.loadPgn;
    applyUciMoveRef.current = gameState.actions.applyUciMove;
  }, [
    gameState.actions.applyUciMove,
    gameState.actions.loadPgn,
    gameState.fen,
    gameState.history,
    gameState.isGameOver,
    gameState.pgn,
    gameState.result,
    gameState.turn,
  ]);

  const syncFromPersistedRecord = useCallback(async () => {
    if (!gameId) {
      return null;
    }

    const record = await loadLiveGameRecord(gameId);

    if (!record) {
      return null;
    }

    liveRecordRef.current = record;
    setLiveRecord(record);

    if (
      record.pgn &&
      (
        record.moveCount > latestGameRef.current.history.length
        || (
          record.moveCount === latestGameRef.current.history.length
          && record.pgn !== latestGameRef.current.pgn
        )
      )
    ) {
      loadPgnRef.current(record.pgn);
      lastAppliedRemoteMoveCountRef.current = record.moveCount;
      lastBroadcastMoveCountRef.current = record.moveCount;
    }

    return record;
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !isEnabled) {
      return;
    }

    let isMounted = true;

    syncFromPersistedRecord()
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Live game recovery failed.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [gameId, isEnabled, syncFromPersistedRecord]);

  const persistRoomState = useCallback(async (seats: LiveSeat[]) => {
    if (!gameId) {
      return null;
    }

    const persisted = liveRecordRef.current;
    const localMoveCount = latestGameRef.current.history.length;
    const persistedMoveCount = persisted?.moveCount ?? 0;
    const shouldUsePersisted = persistedMoveCount > localMoveCount;
    const shouldSkipEmptyJoinWrite =
      seats.length > 1 &&
      localMoveCount === 0 &&
      persistedMoveCount === 0 &&
      !persisted;

    if (shouldSkipEmptyJoinWrite) {
      return null;
    }

    const baseFen = shouldUsePersisted
      ? persisted!.fen
      : latestGameRef.current.fen;
    const basePgn = shouldUsePersisted
      ? persisted!.pgn
      : latestGameRef.current.pgn;
    const baseMoveCount = shouldUsePersisted
      ? persisted!.moveCount
      : localMoveCount;
    const baseResult = shouldUsePersisted
      ? persisted!.result
      : latestGameRef.current.result ?? "in-progress";
    const baseLastMoveUci = shouldUsePersisted
      ? persisted!.lastMoveUci
      : null;
    const createdBy = persisted?.createdBy ?? identityRef.current.key;

    const record = await upsertLiveGameRecord({
      blackName: seats.find((entry) => entry.color === "b")?.name ?? null,
      blackPlayerKey:
        seats.find((entry) => entry.color === "b")?.presenceKey ?? null,
      createdBy,
      fen: baseFen,
      gameId,
      lastMoveUci: baseLastMoveUci,
      moveCount: baseMoveCount,
      pgn: basePgn,
      result: baseResult,
      status: getRecordStatus({
        hasMoves: baseMoveCount > 0,
        isGameOver: baseResult !== "in-progress",
        seats,
      }),
      whiteName: seats.find((entry) => entry.color === "w")?.name ?? null,
      whitePlayerKey:
        seats.find((entry) => entry.color === "w")?.presenceKey ?? null,
    });

    if (record) {
      liveRecordRef.current = record;
      setLiveRecord(record);
    }

    return record;
  }, [gameId]);

  const syncLocalGameState = useCallback(async () => {
    if (!gameId || !channelRef.current || status !== "ready" || assignedColor === null) {
      return;
    }

    const currentMoveCount = latestGameRef.current.history.length;

    if (currentMoveCount === 0) {
      return;
    }

    if (lastAppliedRemoteMoveCountRef.current === currentMoveCount) {
      return;
    }

    const lastMove = latestGameRef.current.history.at(-1);

    if (!lastMove || lastMove.color !== assignedColor) {
      return;
    }

    const persistedMoveCount = liveRecordRef.current?.moveCount ?? 0;
    const alreadySyncedMoveCount = Math.max(
      lastBroadcastMoveCountRef.current,
      persistedMoveCount,
    );

    if (currentMoveCount <= alreadySyncedMoveCount) {
      return;
    }

    const uci = `${lastMove.from}${lastMove.to}${lastMove.promotion ?? ""}`;
    const nextStatus = getLiveStatusForBoardState({
      hasMoves: currentMoveCount > 0,
      isGameOver: latestGameRef.current.isGameOver,
    });

    const record = await upsertLiveGameRecord({
      blackName: presence.find((entry) => entry.color === "b")?.name ?? null,
      blackPlayerKey:
        presence.find((entry) => entry.color === "b")?.presenceKey ?? null,
      createdBy: liveRecordRef.current?.createdBy ?? identityRef.current.key,
      fen: latestGameRef.current.fen,
      gameId,
      lastMoveUci: uci,
      moveCount: currentMoveCount,
      pgn: latestGameRef.current.pgn,
      result: latestGameRef.current.result ?? "in-progress",
      status: nextStatus,
      whiteName: presence.find((entry) => entry.color === "w")?.name ?? null,
      whitePlayerKey:
        presence.find((entry) => entry.color === "w")?.presenceKey ?? null,
    });

    if (record) {
      liveRecordRef.current = record;
      setLiveRecord(record);
    }

    lastBroadcastMoveCountRef.current = currentMoveCount;

    if (currentMoveCount === alreadySyncedMoveCount + 1) {
      await channelRef.current.send({
        type: "broadcast",
        event: "move",
        payload: {
          fen: latestGameRef.current.fen,
          moveCount: currentMoveCount,
          pgn: latestGameRef.current.pgn,
          result: latestGameRef.current.result ?? "in-progress",
          senderKey: identityRef.current.key,
          status: nextStatus,
          uci,
        } satisfies LiveMovePayload,
      });

      return;
    }

    await channelRef.current.send({
      type: "broadcast",
      event: "snapshot",
      payload: {
        fen: latestGameRef.current.fen,
        moveCount: currentMoveCount,
        pgn: latestGameRef.current.pgn,
        result: latestGameRef.current.result ?? "in-progress",
        senderKey: identityRef.current.key,
        status: nextStatus,
      } satisfies LiveSnapshotPayload,
    });
  }, [assignedColor, gameId, presence, status]);

  useEffect(() => {
    if (!gameId || !isEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase.channel(getLiveChannelName(gameId), {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: identityRef.current.key },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const nextPresence = getPresenceEntries(channel);
        setPresence(nextPresence);
        const seat = nextPresence.find(
          (entry) => entry.presenceKey === identityRef.current.key,
        );
        setAssignedColor(seat?.color ?? null);

        if (nextPresence.length > 1) {
          void syncFromPersistedRecord().catch(() => undefined);
        }

        void persistRoomState(nextPresence).catch((nextError) => {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Live room presence sync failed.",
          );
        });
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const move = payload as LiveMovePayload;

        if (move.senderKey === identityRef.current.key) {
          return;
        }

        if (move.moveCount <= latestGameRef.current.history.length) {
          return;
        }

        lastAppliedRemoteMoveCountRef.current = move.moveCount;
        applyUciMoveRef.current(move.uci);
        setLiveRecord((current) => {
          const nextRecord = current
            ? {
              ...current,
              fen: move.fen,
              lastMoveUci: move.uci,
              moveCount: move.moveCount,
              pgn: move.pgn,
              result: move.result,
              status: move.status,
              updatedAt: new Date().toISOString(),
            }
            : current;

          liveRecordRef.current = nextRecord;
          return nextRecord;
        });
      })
      .on("broadcast", { event: "snapshot-request" }, async ({ payload }) => {
        const requesterKey = String((payload as { senderKey: string }).senderKey ?? "");

        if (requesterKey === identityRef.current.key) {
          return;
        }

        const persisted = liveRecordRef.current;
        const localMoveCount = latestGameRef.current.history.length;
        const persistedMoveCount = persisted?.moveCount ?? 0;
        const shouldUsePersisted = persistedMoveCount > localMoveCount;
        const snapshotStatus = shouldUsePersisted
          ? persisted!.status
          : getLiveStatusForBoardState({
            hasMoves: localMoveCount > 0,
            isGameOver: latestGameRef.current.isGameOver,
          });

        await channel.send({
          type: "broadcast",
          event: "snapshot",
          payload: {
            fen: shouldUsePersisted ? persisted!.fen : latestGameRef.current.fen,
            moveCount: shouldUsePersisted ? persisted!.moveCount : localMoveCount,
            pgn: shouldUsePersisted ? persisted!.pgn : latestGameRef.current.pgn,
            result: shouldUsePersisted
              ? persisted!.result
              : latestGameRef.current.result ?? "in-progress",
            senderKey: identityRef.current.key,
            status: snapshotStatus,
          } satisfies LiveSnapshotPayload,
        });
      })
      .on("broadcast", { event: "snapshot" }, ({ payload }) => {
        const snapshot = payload as LiveSnapshotPayload;

        if (snapshot.senderKey === identityRef.current.key) {
          return;
        }

        if (
          snapshot.moveCount < latestGameRef.current.history.length
          || (
            snapshot.moveCount === latestGameRef.current.history.length
            && snapshot.pgn === latestGameRef.current.pgn
          )
        ) {
          return;
        }

        lastAppliedRemoteMoveCountRef.current = snapshot.moveCount;
        loadPgnRef.current(snapshot.pgn);
        setLiveRecord((current) => {
          const nextRecord = current
            ? {
              ...current,
              fen: snapshot.fen,
              moveCount: snapshot.moveCount,
              pgn: snapshot.pgn,
              result: snapshot.result,
              status: snapshot.status,
              updatedAt: new Date().toISOString(),
            }
            : current;

          liveRecordRef.current = nextRecord;
          return nextRecord;
        });
      })
      .subscribe(async (nextStatus) => {
        if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          setStatus("error");
          return;
        }

        if (nextStatus !== "SUBSCRIBED") {
          return;
        }

        setStatus("ready");

        await channel.track({
          isGuest: !sessionUser,
          joinedAt: new Date().toISOString(),
          name: identityRef.current.name,
          presenceKey: identityRef.current.key,
        } satisfies LivePresence);

        await syncFromPersistedRecord().catch(() => null);

        await channel.send({
          type: "broadcast",
          event: "snapshot-request",
          payload: { senderKey: identityRef.current.key },
        });

        try {
          const seats = getPresenceEntries(channel);
          await persistRoomState(seats);
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Live game record setup failed.",
          );
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    authStatus,
    gameId,
    identity.key,
    identity.name,
    isEnabled,
    persistRoomState,
    sessionUser,
    syncFromPersistedRecord,
  ]);

  useEffect(() => {
    void syncLocalGameState().catch((nextError) => {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Live game sync failed.",
      );
    });
  }, [
    gameState.fen,
    gameState.history,
    gameState.isGameOver,
    gameState.pgn,
    gameState.result,
    presence,
    status,
    syncLocalGameState,
  ]);

  useEffect(() => {
    if (
      !gameId ||
      !gameState.isGameOver ||
      !sessionUser ||
      savedFinalHistoryRef.current ||
      !gameState.result
    ) {
      return;
    }

    savedFinalHistoryRef.current = true;

    void savePersistedGame({
      fen: gameState.fen,
      mode: "live",
      moveCount: gameState.history.length,
      pgn: gameState.pgn,
      result: gameState.result,
      summary: `Live match · ${gameState.result}`,
      userId: sessionUser.id,
    }).catch(() => {
      savedFinalHistoryRef.current = false;
    });
  }, [
    gameId,
    gameState.fen,
    gameState.history.length,
    gameState.isGameOver,
    gameState.pgn,
    gameState.result,
    sessionUser,
  ]);

  useEffect(() => {
    if (!gameState.isGameOver || !gameState.result) {
      return;
    }

    const whiteSeat = presence.find((entry) => entry.color === "w");
    const blackSeat = presence.find((entry) => entry.color === "b");
    const isRatedMatch = Boolean(
      whiteSeat &&
      blackSeat &&
      !whiteSeat.isGuest &&
      !blackSeat.isGuest &&
      whiteSeat.presenceKey &&
      blackSeat.presenceKey,
    );

    if (!isRatedMatch || !sessionUser || ratedResultHandledRef.current) {
      return;
    }

    ratedResultHandledRef.current = true;
    setRatingStatus("processing");

    const outcome = getRatingOutcome(gameState.result, gameState.turn);

    void loadProfilesByIds([whiteSeat!.presenceKey, blackSeat!.presenceKey])
      .then(async (players) => {
        const whiteProfile = players.find(
          (player) => player.id === whiteSeat!.presenceKey,
        );
        const blackProfile = players.find(
          (player) => player.id === blackSeat!.presenceKey,
        );

        if (!whiteProfile || !blackProfile) {
          setRatingStatus("skipped");
          return;
        }

        const nextRatings = calculateNextRatings({
          blackRating: blackProfile.rating,
          blackScore: outcome.blackScore,
          whiteRating: whiteProfile.rating,
          whiteScore: outcome.whiteScore,
        });

        const isWhitePlayer = sessionUser.id === whiteProfile.id;
        const isBlackPlayer = sessionUser.id === blackProfile.id;

        if (!isWhitePlayer && !isBlackPlayer) {
          setRatingStatus("skipped");
          return;
        }

        const nextRating = isWhitePlayer
          ? nextRatings.whiteRating
          : nextRatings.blackRating;

        await updateProfileRating({
          rating: nextRating,
          userId: sessionUser.id,
        });

        await refreshProfile();
        setRatingStatus("applied");
      })
      .catch((nextError) => {
        ratedResultHandledRef.current = false;
        setRatingStatus("error");
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Rating update failed.",
        );
      });
  }, [
    gameState.isGameOver,
    gameState.result,
    gameState.turn,
    presence,
    refreshProfile,
    sessionUser,
  ]);

  const isRatedMatch = useMemo(() => {
    const whiteSeat = presence.find((entry) => entry.color === "w");
    const blackSeat = presence.find((entry) => entry.color === "b");

    return Boolean(
      whiteSeat &&
      blackSeat &&
      !whiteSeat.isGuest &&
      !blackSeat.isGuest &&
      whiteSeat.presenceKey &&
      blackSeat.presenceKey,
    );
  }, [presence]);
  const effectiveRatingStatus =
    !isRatedMatch && gameState.isGameOver ? "skipped" : ratingStatus;

  return useMemo(
    () => ({
      assignedColor,
      canMove: assignedColor === gameState.turn && !gameState.isGameOver,
      error,
      isRatedMatch,
      liveRecord,
      presence,
      ratingStatus: effectiveRatingStatus,
      shareUrl,
      status: effectiveStatus,
      userLabel: identity.name,
    }),
    [
      assignedColor,
      effectiveStatus,
      error,
      gameState.isGameOver,
      gameState.turn,
      effectiveRatingStatus,
      identity.name,
      isRatedMatch,
      liveRecord,
      presence,
      shareUrl,
    ],
  );
}
