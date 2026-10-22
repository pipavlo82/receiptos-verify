import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const research = fileURLToPath(new URL('../', import.meta.url));
export const host = fileURLToPath(new URL('../../../', import.meta.url));
export const support = resolve(process.env.AGENT_ACTION_SUPPORT ?? 'D:/PAVLO HQ/Workspaces/agent-action-verify-v0');
export const source = repo => resolve(support, 'sources', repo.replace('/', '--'));
export const bun = process.env.BUN_EXECUTABLE ?? (process.platform === 'win32' ? 'C:/Users/msi/.bun/bin/bun.exe' : 'bun');
