import type { EngineDifficulty } from "@/entities/game/model/types";

const ENGINE_URL = "/stockfish/stockfish-17.1-lite-single-03e3232.js";

export type EngineInfo = {
  depth: number;
  scoreCp?: number;
  mateIn?: number;
  pv?: string[];
};

export type EngineBestMove = {
  bestMove: string;
  ponder?: string;
};

type SearchOptions = {
  difficulty: EngineDifficulty;
  fen: string;
  onInfo?: (info: EngineInfo) => void;
  signal?: AbortSignal;
};

type PendingSearch = {
  onInfo?: (info: EngineInfo) => void;
  reject: (reason?: unknown) => void;
  resolve: (value: EngineBestMove) => void;
};

const difficultyConfig: Record<
  EngineDifficulty,
  { depth: number; moveTime: number; skill: number }
> = {
  easy: { depth: 8, moveTime: 180, skill: 4 },
  medium: { depth: 12, moveTime: 350, skill: 10 },
  hard: { depth: 16, moveTime: 650, skill: 18 },
};

function createAbortError() {
  return new DOMException("Engine search aborted.", "AbortError");
}

function parseInfo(line: string): EngineInfo | null {
  if (!line.startsWith("info ")) {
    return null;
  }

  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const cpMatch = line.match(/\bscore cp\s+(-?\d+)/);
  const mateMatch = line.match(/\bscore mate\s+(-?\d+)/);
  const pvMatch = line.match(/\bpv\s+(.+)$/);

  if (!depthMatch) {
    return null;
  }

  return {
    depth: Number(depthMatch[1]),
    scoreCp: cpMatch ? Number(cpMatch[1]) : undefined,
    mateIn: mateMatch ? Number(mateMatch[1]) : undefined,
    pv: pvMatch ? pvMatch[1].trim().split(/\s+/) : undefined,
  };
}

function parseBestMove(line: string): EngineBestMove | null {
  const match = line.match(/^bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);

  if (!match) {
    return null;
  }

  return {
    bestMove: match[1],
    ponder: match[2],
  };
}

export class StockfishClient {
  private isReady = false;

  private pendingReadyResolvers: Array<() => void> = [];

  private pendingSearch: PendingSearch | null = null;

  private worker: Worker;

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = this.handleMessage;
    this.send("uci");
  }

  dispose() {
    this.stop();
    this.worker.terminate();
  }

  async ready() {
    if (this.isReady) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.pendingReadyResolvers.push(resolve);
    });
  }

  async search({
    difficulty,
    fen,
    onInfo,
    signal,
  }: SearchOptions): Promise<EngineBestMove> {
    await this.ready();

    if (signal?.aborted) {
      throw createAbortError();
    }

    this.stop();

    const config = difficultyConfig[difficulty];

    return await new Promise<EngineBestMove>((resolve, reject) => {
      const abort = () => {
        this.stop();
        reject(createAbortError());
      };

      signal?.addEventListener("abort", abort, { once: true });

      this.pendingSearch = {
        onInfo,
        reject: (reason) => {
          signal?.removeEventListener("abort", abort);
          reject(reason);
        },
        resolve: (value) => {
          signal?.removeEventListener("abort", abort);
          resolve(value);
        },
      };

      this.send("stop");
      this.send("ucinewgame");
      this.send("isready");
      this.send(`setoption name Skill Level value ${config.skill}`);
      this.send("setoption name Threads value 1");
      this.send("setoption name Hash value 16");
      this.send(`position fen ${fen}`);
      this.send(`go depth ${config.depth} movetime ${config.moveTime}`);
    });
  }

  stop() {
    if (!this.pendingSearch) {
      this.send("stop");
      return;
    }

    const pendingSearch = this.pendingSearch;
    this.pendingSearch = null;
    this.send("stop");
    pendingSearch.reject(createAbortError());
  }

  private handleMessage = (event: MessageEvent<string>) => {
    const data = typeof event.data === "string" ? event.data : String(event.data);
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      if (line === "uciok") {
        this.send("isready");
        return;
      }

      if (line === "readyok") {
        this.isReady = true;
        this.pendingReadyResolvers.splice(0).forEach((resolve) => resolve());
        return;
      }

      const info = parseInfo(line);
      if (info && this.pendingSearch?.onInfo) {
        this.pendingSearch.onInfo(info);
        return;
      }

      const bestMove = parseBestMove(line);
      if (bestMove && this.pendingSearch) {
        const pendingSearch = this.pendingSearch;
        this.pendingSearch = null;
        pendingSearch.resolve(bestMove);
      }
    });
  };

  private send(command: string) {
    this.worker.postMessage(command);
  }
}
