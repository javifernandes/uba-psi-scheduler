#!/usr/bin/env node

import { chromium } from 'playwright';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

type CatalogRow = {
  catedraNumero: string;
  materiaNombre: string;
  catedraTexto: string;
  url: string;
};

type CatalogCareer = {
  code: string;
  label: string;
  rows: CatalogRow[];
};

type SectionRow = {
  id: string;
  dia: string;
  inicio: string;
  fin: string;
  profesor: string;
  oblig: string;
  aula: string;
  observ: string;
};

type DetailData = {
  headingText: string;
  teoricos: SectionRow[];
  seminarios: SectionRow[];
  comisiones: SectionRow[];
};

type SubjectOut = {
  id: string;
  label: string;
  header: string;
  teoricos: string[];
  seminarios: string[];
  comisiones: string[];
};

type CareerConfig = {
  code: string;
  slug: string;
  label: string;
};

type CliOptions = {
  outputDir: string;
  limit?: number;
  careers: CareerConfig[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CATALOG_URL = 'http://academica.psi.uba.ar/Psi/Ope154_.php';
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../src/data/uba/psicologia/oferta');

const CAREERS: CareerConfig[] = [
  { code: 'PS', slug: 'lic-psicologia', label: 'Licenciatura en Psicología' },
  { code: 'PR', slug: 'profesorado-psicologia', label: 'Profesorado en Psicología' },
  { code: 'LM', slug: 'lic-musicoterapia', label: 'Licenciatura en Musicoterapia' },
  { code: 'TE', slug: 'lic-terapia-ocupacional', label: 'Licenciatura en Terapia Ocupacional' },
];

const careerByToken = new Map<string, CareerConfig>(
  CAREERS.flatMap(career => [
    [career.code.toLowerCase(), career],
    [career.slug.toLowerCase(), career],
  ])
);

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  let outputDir = DEFAULT_OUTPUT_DIR;
  let limit: number | undefined;
  let careerTokens: string[] = CAREERS.map(career => career.code);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--output-dir' && args[i + 1]) {
      outputDir = path.resolve(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === '--career' && args[i + 1]) {
      careerTokens = args[i + 1]
        .split(',')
        .map(token => token.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
  }

  const careers =
    careerTokens.length === 1 && careerTokens[0]?.toLowerCase() === 'all'
      ? CAREERS
      : careerTokens
          .map(token => careerByToken.get(token.toLowerCase()))
          .filter((career): career is CareerConfig => Boolean(career));

  if (!careers.length) {
    throw new Error(
      `No se encontraron carreras válidas en --career. Usá: ${CAREERS.map(c => c.code).join(',')}, all o slugs.`
    );
  }

  return { outputDir, limit, careers };
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeKey = (value: string) =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const slugify = (value: string) =>
  normalizeKey(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');

const normalizeDay = (value: string) => {
  const day = normalizeKey(value);
  if (day.startsWith('mier')) return 'miercoles';
  if (day.startsWith('sab')) return 'sabado';
  if (day.startsWith('lun')) return 'lunes';
  if (day.startsWith('mar')) return 'martes';
  if (day.startsWith('jue')) return 'jueves';
  if (day.startsWith('vie')) return 'viernes';
  if (day.startsWith('dom')) return 'domingo';
  return day;
};

const normalizeTime = (value: string) => {
  const match = normalizeText(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return normalizeText(value);
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  return `${hh}:${mm}`;
};

const sanitizeObserv = (value: string) => {
  const clean = normalizeText(value);
  return clean === '.' ? '' : clean;
};

const parseHeading = (headingText: string, row: CatalogRow, career: CareerConfig) => {
  const normalized = normalizeText(headingText);
  const match = normalized.match(
    /c[aá]tedra\s+(\d+)\s*-\s*([ivxlcdm]+)\s*-\s*prof\.\s*([^*]+)\*\s*materia\s*\(\s*(\d+)\s*-\s*([^)]+)\)/i
  );

  const catedraNumero = match?.[1] || row.catedraNumero;
  const catedraDivision = (match?.[2] || row.catedraTexto.split('-')[0] || '').trim().toUpperCase();
  const profesor = (match?.[3] || row.catedraTexto.split('-').slice(1).join('-') || '')
    .replace(/^prof\.\s*/i, '')
    .replace(/^lic\.\s*/i, '')
    .trim();
  const materiaNumero = (match?.[4] || '').trim();
  const materiaNombre = normalizeText(match?.[5] || row.materiaNombre);
  const profesorApellido = normalizeText(profesor.split(',')[0] || profesor.split(' ')[0] || '')
    .replace(/^dr\.?\s*/i, '')
    .replace(/^lic\.?\s*/i, '');

  const labelMateriaNumero = materiaNumero ? `(${materiaNumero}) ` : '';
  const label = `${labelMateriaNumero}${materiaNombre} - Cátedra ${catedraNumero}${
    catedraDivision ? ` (${catedraDivision})` : ''
  }`;
  const header = `Psicología UBA - ${career.label} - ${labelMateriaNumero}${materiaNombre} - Cátedra ${catedraNumero}${
    catedraDivision ? ` - ${catedraDivision}` : ''
  }${profesorApellido ? ` - ${profesorApellido}` : ''}`;
  const idPrefix = materiaNumero ? `${materiaNumero}-${slugify(materiaNombre)}` : slugify(materiaNombre);
  const id = `${idPrefix}-c${catedraNumero}${catedraDivision ? `-${slugify(catedraDivision)}` : ''}`;

  return { id, label, header };
};

const rowToTeoSemLine = (row: SectionRow) =>
  [row.id, row.dia, row.inicio, row.fin, row.profesor, row.aula, row.observ].join('|');

const rowToComisionLine = (row: SectionRow) =>
  [row.id, row.dia, row.inicio, row.fin, row.profesor, row.oblig, row.aula, row.observ].join('|');

const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
  const options = parseArgs();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Abriendo catálogo: ${DEFAULT_CATALOG_URL}`);
    await page.goto(DEFAULT_CATALOG_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const careersFromCatalog = await page.evaluate(() => {
      const text = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
      const tabsRoot = document.querySelector('#tabs');
      if (!tabsRoot) return [] as CatalogCareer[];

      const tabAnchors = Array.from(
        tabsRoot.querySelectorAll<HTMLAnchorElement>('ul li a[href^="#"]')
      );

      const careers = tabAnchors.map(anchor => {
        const code = (anchor.getAttribute('href') || '').replace('#', '').trim().toUpperCase();
        const label = text(anchor.textContent);
        const panel = tabsRoot.querySelector<HTMLElement>(`#${code}`);
        if (!panel) return { code, label, rows: [] as CatalogRow[] };

        const rows = Array.from(panel.querySelectorAll<HTMLTableRowElement>('table tr'))
          .map(row => {
            const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>('td'));
            if (cells.length < 3) return null;
            const primaryAnchor = row.querySelector<HTMLAnchorElement>('a[href*="Ver154_.php?catedra="]');
            if (!primaryAnchor) return null;
            const url = new URL(primaryAnchor.getAttribute('href') || '', window.location.href).href;
            return {
              catedraNumero: text(cells[0]?.textContent),
              materiaNombre: text(cells[1]?.textContent),
              catedraTexto: text(cells[2]?.textContent),
              url,
            };
          })
          .filter((item): item is CatalogRow => Boolean(item?.url && item.catedraNumero));

        const dedupedRows = Array.from(new Map(rows.map(item => [item.url, item])).values());
        return { code, label, rows: dedupedRows };
      });

      return careers;
    });

    const selectedCodes = new Set(options.careers.map(career => career.code));
    const careersToProcess = careersFromCatalog
      .filter(career => selectedCodes.has(career.code))
      .map(career => {
        const config = options.careers.find(item => item.code === career.code);
        if (!config) return null;
        return {
          ...config,
          rows: career.rows.slice(0, options.limit ?? career.rows.length),
          totalRows: career.rows.length,
        };
      })
      .filter(
        (item): item is CareerConfig & { rows: CatalogRow[]; totalRows: number } => Boolean(item)
      );

    if (!careersToProcess.length) {
      throw new Error('No se encontraron carreras configuradas en el catálogo de UBA.');
    }

    console.log(
      careersToProcess
        .map(
          career =>
            `${career.code} ${career.label}: ${career.totalRows} cátedras (a extraer ${career.rows.length})`
        )
        .join('\n')
    );

    const outSummary: Array<{ code: string; slug: string; label: string; subjects: number }> = [];

    for (const career of careersToProcess) {
      const subjects: SubjectOut[] = [];
      const total = career.rows.length;

      for (let index = 0; index < total; index += 1) {
        const row = career.rows[index];
        console.log(
          `[${career.code}] [${index + 1}/${total}] ${row.catedraNumero} - ${row.materiaNombre}`
        );
        await page.goto(row.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });

        const detail = await page.evaluate<DetailData>(() => {
          const text = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
          const normalize = (value: string) =>
            text(value)
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase();
          const headingText =
            text(document.querySelector('body')?.innerText.split('\n').find(line => line.includes('Listado horarios de cátedra')) || '') ||
            text(document.querySelector('h1, h2, h3')?.textContent);

          const parseTableRows = (
            table: HTMLTableElement,
            sectionMatchers: string[]
          ): SectionRow[] | null => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length < 2) return null;
            const headerCells = Array.from(rows[0].querySelectorAll('th,td')).map(cell => normalize(cell.textContent || ''));
            if (!headerCells.length) return null;
            if (!sectionMatchers.some(token => headerCells[0]?.includes(token))) return null;

            const findIndex = (patterns: string[]) =>
              headerCells.findIndex(cell => patterns.some(pattern => cell.includes(pattern)));

            const idxId = 0;
            const idxDia = findIndex(['dia']);
            const idxInicio = findIndex(['inicio']);
            const idxFin = findIndex(['fin']);
            const idxProfesor = findIndex(['profesor']);
            const idxOblig = findIndex(['oblig']);
            const idxAula = findIndex(['aula']);
            const idxObserv = findIndex(['observ']);

            return rows
              .slice(1)
              .map(row => Array.from(row.querySelectorAll('td')).map(cell => text(cell.textContent)))
              .filter(cells => cells.length > 0 && cells.some(value => value.length > 0))
              .map(cells => ({
                id: cells[idxId] || '',
                dia: idxDia >= 0 ? cells[idxDia] || '' : '',
                inicio: idxInicio >= 0 ? cells[idxInicio] || '' : '',
                fin: idxFin >= 0 ? cells[idxFin] || '' : '',
                profesor: idxProfesor >= 0 ? cells[idxProfesor] || '' : '',
                oblig: idxOblig >= 0 ? cells[idxOblig] || '' : '',
                aula: idxAula >= 0 ? cells[idxAula] || '' : '',
                observ: idxObserv >= 0 ? cells[idxObserv] || '' : '',
              }))
              .filter(row => row.id.length > 0);
          };

          const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'));
          const teoricos: SectionRow[] = [];
          const seminarios: SectionRow[] = [];
          const comisiones: SectionRow[] = [];

          tables.forEach(table => {
            const teoRows = parseTableRows(table, ['teorico', 'teoricos']);
            if (teoRows) {
              teoricos.push(...teoRows);
              return;
            }
            const semRows = parseTableRows(table, ['seminario', 'seminarios']);
            if (semRows) {
              seminarios.push(...semRows);
              return;
            }
            const comRows = parseTableRows(table, ['comision', 'comisiones']);
            if (comRows) {
              comisiones.push(...comRows);
            }
          });

          return { headingText, teoricos, seminarios, comisiones };
        });

        const parsedHeader = parseHeading(detail.headingText, row, career);
        const normalizeRow = (item: SectionRow): SectionRow => ({
          id: normalizeText(item.id),
          dia: normalizeDay(item.dia),
          inicio: normalizeTime(item.inicio),
          fin: normalizeTime(item.fin),
          profesor: normalizeText(item.profesor),
          oblig: normalizeText(item.oblig),
          aula: normalizeText(item.aula).toUpperCase(),
          observ: sanitizeObserv(item.observ),
        });

        const teoricos = detail.teoricos.map(normalizeRow).filter(item => item.id && item.dia);
        const seminarios = detail.seminarios.map(normalizeRow).filter(item => item.id && item.dia);
        const comisiones = detail.comisiones.map(normalizeRow).filter(item => item.id && item.dia);

        subjects.push({
          id: parsedHeader.id,
          label: parsedHeader.label,
          header: parsedHeader.header,
          teoricos: teoricos.map(rowToTeoSemLine),
          seminarios: seminarios.map(rowToTeoSemLine),
          comisiones: comisiones.map(rowToComisionLine),
        });

        await sleep(120);
      }

      const careerDir = path.join(options.outputDir, career.slug, 'materias');
      await fs.mkdir(careerDir, { recursive: true });
      const existing = await fs.readdir(careerDir);
      await Promise.all(
        existing
          .filter(file => file.endsWith('.json'))
          .map(file => fs.unlink(path.join(careerDir, file)))
      );

      await Promise.all(
        subjects.map(async subject => {
          const catedraMatch = subject.label.match(/Cátedra\s+(\d+)/i);
          const fileName = `${catedraMatch?.[1] || subject.id}.json`;
          await fs.writeFile(path.join(careerDir, fileName), `${JSON.stringify(subject, null, 2)}\n`, 'utf-8');
        })
      );

      outSummary.push({
        code: career.code,
        slug: career.slug,
        label: career.label,
        subjects: subjects.length,
      });
      console.log(`OK [${career.code}] ${career.slug}: ${subjects.length} materias.`);
    }

    await fs.mkdir(options.outputDir, { recursive: true });
    await fs.writeFile(
      path.join(options.outputDir, 'careers.generated.json'),
      `${JSON.stringify(outSummary, null, 2)}\n`,
      'utf8'
    );

    console.log(`\nSalida generada en: ${options.outputDir}`);
  } finally {
    await page.close();
    await browser.close();
  }
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
