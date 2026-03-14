#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

type WindowDefinition = {
  id: string;
  label: string;
  start: string;
  end: string;
  enabled?: boolean;
};

type ProfileDefinition = {
  startHour: number;
  endHour: number;
  intervalMinutes: number;
};

type WindowsConfig = {
  timezone: string;
  profiles: {
    day: ProfileDefinition;
    night: ProfileDefinition;
  };
  windows: WindowDefinition[];
  updatedAt?: string;
};

type StatusResult = {
  shouldRun: boolean;
  reason: string;
  trigger: 'schedule' | 'manual';
  profile: 'day' | 'night' | 'none';
  activeWindowId: string;
  nowIso: string;
  nowLocal: string;
};

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config/scraper-windows.json');

const getArg = (name: string, fallback = '') => {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
};

const parseDate = (value: string, field: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fecha inválida en ${field}: ${value}`);
  }
  return parsed;
};

const readConfig = async (filePath: string): Promise<WindowsConfig> => {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as WindowsConfig;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Configuración inválida: se esperaba objeto JSON.');
  }
  if (typeof parsed.timezone !== 'string' || !parsed.timezone.trim()) {
    throw new Error('Configuración inválida: falta `timezone`.');
  }
  if (!Array.isArray(parsed.windows)) {
    throw new Error('Configuración inválida: falta `windows`.');
  }
  if (!parsed.profiles?.day || !parsed.profiles?.night) {
    throw new Error('Configuración inválida: faltan perfiles `day` y/o `night`.');
  }
  return parsed;
};

const writeConfig = async (filePath: string, config: WindowsConfig) => {
  const normalized = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
};

const localParts = (date: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const year = values.year || '0000';
  const month = values.month || '00';
  const day = values.day || '00';
  const hour = Number.parseInt(values.hour || '0', 10);
  const minute = Number.parseInt(values.minute || '0', 10);
  const second = Number.parseInt(values.second || '0', 10);

  return {
    hour,
    minute,
    second,
    iso: `${year}-${month}-${day}T${values.hour || '00'}:${values.minute || '00'}:${values.second || '00'}`,
  };
};

const isWithinProfile = (hour: number, profile: ProfileDefinition) => {
  if (profile.startHour === profile.endHour) return true;
  if (profile.startHour < profile.endHour) {
    return hour >= profile.startHour && hour < profile.endHour;
  }
  return hour >= profile.startHour || hour < profile.endHour;
};

const appendOutput = (pairs: Record<string, string>) => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(pairs).map(([key, value]) => `${key}=${value}`);
  return fs.appendFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
};

const findActiveWindow = (config: WindowsConfig, nowMs: number) =>
  config.windows.find((window) => {
    if (window.enabled === false) return false;
    const startMs = parseDate(window.start, `${window.id}.start`);
    const endMs = parseDate(window.end, `${window.id}.end`);
    return startMs <= nowMs && nowMs <= endMs;
  });

const runStatus = async () => {
  const configPath = path.resolve(getArg('--config', DEFAULT_CONFIG_PATH));
  const force = getArg('--force', 'false') === 'true';
  const trigger = (getArg('--trigger', 'manual') === 'schedule' ? 'schedule' : 'manual') as
    | 'schedule'
    | 'manual';

  const config = await readConfig(configPath);
  const now = new Date();
  const nowMs = now.getTime();
  const local = localParts(now, config.timezone);
  const activeWindow = findActiveWindow(config, nowMs);

  let shouldRun = false;
  let reason = 'outside_window';
  let profile: StatusResult['profile'] = 'none';

  if (force) {
    shouldRun = true;
    reason = 'force_run';
    profile = isWithinProfile(local.hour, config.profiles.day) ? 'day' : 'night';
  } else if (!activeWindow) {
    shouldRun = false;
    reason = 'outside_window';
    profile = 'none';
  } else if (trigger === 'manual') {
    shouldRun = true;
    reason = 'manual_run_active_window';
    profile = isWithinProfile(local.hour, config.profiles.day) ? 'day' : 'night';
  } else if (isWithinProfile(local.hour, config.profiles.day)) {
    shouldRun = true;
    reason = 'schedule_day_profile';
    profile = 'day';
  } else {
    profile = 'night';
    const night = config.profiles.night;
    const nightHourAligned = local.minute === 0;
    const intervalHours = Math.max(1, Math.floor(night.intervalMinutes / 60));
    const hourlyModulo = local.hour % intervalHours === 0;
    shouldRun = nightHourAligned && hourlyModulo;
    reason = shouldRun ? 'schedule_night_profile_slot' : 'schedule_night_profile_wait';
  }

  const result: StatusResult = {
    shouldRun,
    reason,
    trigger,
    profile,
    activeWindowId: activeWindow?.id || '',
    nowIso: now.toISOString(),
    nowLocal: local.iso,
  };

  await appendOutput({
    should_run: String(result.shouldRun),
    status_reason: result.reason,
    active_window_id: result.activeWindowId,
    active_profile: result.profile,
    now_iso: result.nowIso,
    now_local: result.nowLocal,
  });

  console.log(JSON.stringify(result, null, 2));
};

const runClose = async () => {
  const configPath = path.resolve(getArg('--config', DEFAULT_CONFIG_PATH));
  const windowId = getArg('--window-id', '');

  const config = await readConfig(configPath);
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  const target = windowId
    ? config.windows.find((window) => window.id === windowId)
    : findActiveWindow(config, nowMs);

  if (!target) {
    throw new Error(
      windowId ? `No existe la ventana ${windowId}.` : 'No hay ventana activa para cerrar.'
    );
  }

  target.end = nowIso;
  await writeConfig(configPath, config);

  await appendOutput({
    closed_window_id: target.id,
    close_at: nowIso,
  });

  console.log(
    JSON.stringify(
      {
        closedWindowId: target.id,
        closeAt: nowIso,
        configPath,
      },
      null,
      2
    )
  );
};

const main = async () => {
  const command = process.argv[2];
  if (command === 'status') {
    await runStatus();
    return;
  }
  if (command === 'close') {
    await runClose();
    return;
  }

  throw new Error('Uso: scraper-window-control.ts <status|close> [flags]');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
