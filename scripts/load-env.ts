import * as fs from 'node:fs';
import * as path from 'node:path';

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const parseLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const eqIndex = normalized.indexOf('=');
  if (eqIndex <= 0) return null;
  const key = normalized.slice(0, eqIndex).trim();
  const rawValue = normalized.slice(eqIndex + 1).trim();
  if (!key) return null;
  return {
    key,
    value: stripWrappingQuotes(rawValue),
  };
};

const loadEnvFile = (filePath: string, override = false) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const parsed = parseLine(line);
    if (!parsed) return;
    if (!override && typeof process.env[parsed.key] !== 'undefined') return;
    process.env[parsed.key] = parsed.value;
  });
};

const root = process.cwd();
loadEnvFile(path.join(root, '.env'));
loadEnvFile(path.join(root, '.env.local'), true);
