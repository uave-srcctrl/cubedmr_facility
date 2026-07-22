/**
 * Leveled logger.
 *
 * Routes what used to be scattered `console.*` calls through a single sink that
 * respects a log level. In production, `debug` and `info` are silenced; `warn`
 * and `error` always pass. The level can be overridden with the environment
 * variable `VITE_LOG_LEVEL` (one of: debug | info | warn | error).
 *
 * Mapping applied during the LIMP-1 cleanup:
 *   console.log   -> logger.debug   (silent in production)
 *   console.info  -> logger.info    (silent in production)
 *   console.warn  -> logger.warn
 *   console.error -> logger.error
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function resolveLevel(): Level {
  const env = import.meta.env.VITE_LOG_LEVEL as string | undefined;
  if (env && env in ORDER) return env as Level;
  return import.meta.env.PROD ? 'warn' : 'debug';
}

const threshold = ORDER[resolveLevel()];

function emit(level: Level, args: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const sink =
    level === 'debug' ? console.debug :
    level === 'info' ? console.info :
    level === 'warn' ? console.warn :
    console.error;
  sink(...args);
}

export const logger = {
  debug: (...args: unknown[]): void => emit('debug', args),
  info: (...args: unknown[]): void => emit('info', args),
  warn: (...args: unknown[]): void => emit('warn', args),
  error: (...args: unknown[]): void => emit('error', args),
};
