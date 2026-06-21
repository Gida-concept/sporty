export interface CronResult {
  success: boolean;
  exitCode: 0 | 1 | 2;
  message: string;
  details?: Record<string, unknown>;
}

export interface CronOptions {
  dryRun?: boolean;
}
