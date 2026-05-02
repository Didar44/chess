import { useEffect, useMemo, useRef, useState } from "react";
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
  uci: string;
};

type LiveSnapshotPayload = {
  fen: string;
  moveCount: number;
  pgn: string;
  result: LiveMatchRecord["result"];
  senderKey: string;
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

export function useLiveGame(gameId: string | null, gameState: GameState) {
  const { profile, refreshProfile, sessionUser } = useAuth();
  const [guestIdentity] = useState(() => getOrCreateGuestIdentity());
  const [assignedColor, setAssignedColor] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<LiveSeat[]>([]);
  const [ratingStatus, setRatingStatus] = useState<LiveRatingStatus>("idle");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [liveRecord, setLiveRecord] = useState<LiveMatchRecord | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
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
  const isEnabled = Boolean(gameId && isSupabaseConfigured());
  const shareUrl = useMemo(
    () => (gameId ? getLiveShareUrl(gameId) : null),
    [gameId],
  );
  const effectiveStatus = isEnabled ? status : "disabled";
  const lastBroadcastMoveCountRef = useRef(0);
  const lastAppliedRemoteMoveCountRef = useRef(0);
  const savedFinalHistoryRef = useRef(false);
  const previousMoveCountRef = useRef(gameState.history.length);
  const ratedResultHandledRef = useRef(false);
  const ratedRefreshQueuedRef = useRef(false);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

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

  useEffect(() => {
    if (!gameId || !isEnabled) {
      return;
    }

    let isMounted = true;

    loadLiveGameRecord(gameId)
      .then((record) => {
        if (!isMounted || !record) {
          return;
        }

        setLiveRecord(record);
        if (record.pgn) {
          loadPgnRef.current(record.pgn);
          lastAppliedRemoteMoveCountRef.current = record.moveCount;
          lastBroadcastMoveCountRef.current = record.moveCount;
        }
      })
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
  }, [gameId, isEnabled]);

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
      })
      .on("broadcast", { event: "snapshot-request" }, async ({ payload }) => {
        const requesterKey = String((payload as { senderKey: string }).senderKey ?? "");

        if (requesterKey === identityRef.current.key) {
          return;
        }

        await channel.send({
          type: "broadcast",
          event: "snapshot",
          payload: {
            fen: latestGameRef.current.fen,
            moveCount: latestGameRef.current.history.length,
            pgn: latestGameRef.current.pgn,
            result: latestGameRef.current.result ?? "in-progress",
            senderKey: identityRef.current.key,
          } satisfies LiveSnapshotPayload,
        });
      })
      .on("broadcast", { event: "snapshot" }, ({ payload }) => {
        const snapshot = payload as LiveSnapshotPayload;

        if (snapshot.senderKey === identityRef.current.key) {
          return;
        }

        if (snapshot.moveCount <= latestGameRef.current.history.length) {
          return;
        }

        lastAppliedRemoteMoveCountRef.current = snapshot.moveCount;
        loadPgnRef.current(snapshot.pgn);
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

        await channel.send({
          type: "broadcast",
          event: "snapshot-request",
          payload: { senderKey: identityRef.current.key },
        });

        try {
          const seats = getPresenceEntries(channel);
          await upsertLiveGameRecord({
            blackName: seats.find((entry) => entry.color === "b")?.name ?? null,
            blackPlayerKey:
              seats.find((entry) => entry.color === "b")?.presenceKey ?? null,
            createdBy: identityRef.current.key,
            fen: latestGameRef.current.fen,
            gameId,
            lastMoveUci: null,
            moveCount: latestGameRef.current.history.length,
            pgn: latestGameRef.current.pgn,
            result: latestGameRef.current.result ?? "in-progress",
            status: seats.length > 1 ? "active" : "waiting",
            whiteName: seats.find((entry) => entry.color === "w")?.name ?? null,
            whitePlayerKey:
              seats.find((entry) => entry.color === "w")?.presenceKey ?? null,
          });
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
  }, [gameId, isEnabled, sessionUser]);

  useEffect(() => {
    if (!gameId || !channelRef.current || assignedColor === null) {
      previousMoveCountRef.current = gameState.history.length;
      return;
    }

    const previousMoveCount = previousMoveCountRef.current;
    const currentMoveCount = gameState.history.length;
    previousMoveCountRef.current = currentMoveCount;

    if (currentMoveCount <= previousMoveCount) {
      return;
    }

    if (lastAppliedRemoteMoveCountRef.current === currentMoveCount) {
      return;
    }

    const lastMove = gameState.history.at(-1);

    if (!lastMove) {
      return;
    }

    const senderColor = lastMove.color;

    if (senderColor !== assignedColor) {
      return;
    }

    const uci = `${lastMove.from}${lastMove.to}${lastMove.promotion ?? ""}`;
    lastBroadcastMoveCountRef.current = currentMoveCount;

    void channelRef.current.send({
      type: "broadcast",
      event: "move",
      payload: {
        fen: gameState.fen,
        moveCount: currentMoveCount,
        pgn: gameState.pgn,
        result: gameState.result ?? "in-progress",
        senderKey: identityRef.current.key,
        uci,
      } satisfies LiveMovePayload,
    });

    void upsertLiveGameRecord({
      blackName: presence.find((entry) => entry.color === "b")?.name ?? null,
      blackPlayerKey:
        presence.find((entry) => entry.color === "b")?.presenceKey ?? null,
      createdBy: identityRef.current.key,
      fen: gameState.fen,
      gameId,
      lastMoveUci: uci,
      moveCount: currentMoveCount,
      pgn: gameState.pgn,
      result: gameState.result ?? "in-progress",
      status: gameState.isGameOver ? "finished" : "active",
      whiteName: presence.find((entry) => entry.color === "w")?.name ?? null,
      whitePlayerKey:
        presence.find((entry) => entry.color === "w")?.presenceKey ?? null,
    }).then((record) => {
      if (record) {
        setLiveRecord(record);
      }
    }).catch((nextError) => {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Live game sync failed.",
      );
    });
  }, [
    assignedColor,
    gameId,
    gameState.fen,
    gameState.history,
    gameState.isGameOver,
    gameState.pgn,
    gameState.result,
    presence,
  ]);

  useEffect(() => {
    if (
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

    if (!isRatedMatch) {
      return;
    }

    if (assignedColor === "b" && !ratedRefreshQueuedRef.current) {
      ratedRefreshQueuedRef.current = true;
      window.setTimeout(() => {
        void refreshProfile().catch(() => undefined);
      }, 1400);
    }

    if (assignedColor !== "w" || ratedResultHandledRef.current) {
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

        await Promise.all([
          updateProfileRating({
            rating: nextRatings.whiteRating,
            userId: whiteProfile.id,
          }),
          updateProfileRating({
            rating: nextRatings.blackRating,
            userId: blackProfile.id,
          }),
        ]);

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
    assignedColor,
    gameState.isGameOver,
    gameState.result,
    gameState.turn,
    presence,
    refreshProfile,
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
