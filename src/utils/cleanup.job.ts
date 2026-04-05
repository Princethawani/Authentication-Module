import { TokenService } from '../services/token.service';

export class CleanupJob {
  private interval: NodeJS.Timeout | null = null;
  private tokenService: TokenService;

  constructor(intervalMs: number = 60 * 60 * 1000) { // default: every hour
    this.tokenService = new TokenService();
    this.intervalMs = intervalMs;
  }

  private intervalMs: number;

  // ── Start ─────────────────────────────────────────────────────────────────────

  start(): void {
    console.log('Token cleanup job started');

    // Run once immediately on startup
    this.run();

    // Then run on interval
    this.interval = setInterval(() => {
      this.run();
    }, this.intervalMs);
  }

  // ── Stop ──────────────────────────────────────────────────────────────────────

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Token cleanup job stopped');
    }
  }

  // ── Run ───────────────────────────────────────────────────────────────────────

  private async run(): Promise<void> {
    try {
      const count = await this.tokenService.cleanupExpiredTokens();

      if (count > 0) {
        console.log(`Cleaned up ${count} expired tokens`);
      }
    } catch (err) {
      console.error('Token cleanup job failed:', err);
    }
  }
}