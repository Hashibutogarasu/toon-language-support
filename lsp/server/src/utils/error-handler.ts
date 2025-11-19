import { Connection } from 'vscode-languageserver/node';

/**
 * Execute a function safely, catching and logging any errors
 * @param connection The language server connection
 * @param name The name of the operation (for logging)
 * @param fn The function to execute
 * @param fallbackValue The value to return if the function fails
 * @returns The result of the function or the fallback value
 */
export function safeExecute<T>(
  connection: Connection,
  name: string,
  fn: () => T,
  fallbackValue: T
): T {
  try {
    return fn();
  } catch (error) {
    connection.console.error(`${name} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      connection.console.error(`Stack trace: ${error.stack}`);
    }
    return fallbackValue;
  }
}

/**
 * Execute an async function safely, catching and logging any errors
 * @param connection The language server connection
 * @param name The name of the operation (for logging)
 * @param fn The async function to execute
 * @param fallbackValue The value to return if the function fails
 * @returns The result of the function or the fallback value
 */
export async function safeExecuteAsync<T>(
  connection: Connection,
  name: string,
  fn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    connection.console.error(`${name} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      connection.console.error(`Stack trace: ${error.stack}`);
    }
    return fallbackValue;
  }
}
