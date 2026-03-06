#!/usr/bin/env ts-node

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

type CliOptions = {
  outputDir: string;
  limit?: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CATALOG_URL = 'http://academica.psi.uba.ar/Psi/Ope154_.php';
const DEFAULT_OUTPUT_DIR = path.resolve(
  __dirname,
  '../src/app/uba/psicologia/oferta/lic-psicologia/materias'
);

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  let outputDir = DEFAULT_OUTPUT_DIR;
  let limit: number | undefined;

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
  }

  return { outputDir, limit };
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

const parseHeading = (headingText: string, row: CatalogRow) => {
  const normalized = normalizeText(headingText);
  const match = normalized.match(
    /c[aá]tedra\s+(\d+)\s*-\s*([ivxlcdm]+)\s*-\s*prof\.\s*([^*]+)\*\s*materia\s*\(\s*(\d+)\s*-\s*([^)]+)\)/i
  );

  const catedraNumero = match?.[1] || row.catedraNumero;
  const catedraDivision = (match?.[2] || row.catedraTexto.split('-')[0] || '').trim().toUpperCase();
  const profesor = (match?.[3] || row.catedraTexto.split('-').slice(1).join('-') || '')
    .replace(/^prof\.\s*/i, '')
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
  const header = `Psicología UBA - ${labelMateriaNumero}${materiaNombre} - Cátedra ${catedraNumero}${
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

    const catalogRows = await page.evaluate(() => {
      const text = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
      const isVisible = (element: Element | null) => {
        if (!element) return false;
        const html = element as HTMLElement;
        if (html.offsetParent === null && getComputedStyle(html).position !== 'fixed') return false;
        const style = getComputedStyle(html);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
        return html.getClientRects().length > 0;
      };
      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="Ver154_.php?catedra="]')
      );
      const rows = anchors
        .map(anchor => {
          const tr = anchor.closest('tr');
          if (!tr) return null;
          if (!isVisible(tr) || !isVisible(anchor)) return null;
          const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>('td'));
          if (cells.length < 3) return null;
          return {
            catedraNumero: text(cells[0]?.textContent),
            materiaNombre: text(cells[1]?.textContent),
            catedraTexto: text(cells[2]?.textContent),
            url: new URL(anchor.getAttribute('href') || '', window.location.href).href,
          };
        })
        .filter((row): row is CatalogRow => Boolean(row?.url && row.catedraNumero));
      return Array.from(new Map(rows.map(row => [row.url, row])).values());
    });

    const filteredRows = catalogRows.slice(0, options.limit ?? catalogRows.length);

    console.log(`Cátedras detectadas: ${catalogRows.length}. A extraer: ${filteredRows.length}.`);

    const subjects: SubjectOut[] = [];
    for (let index = 0; index < filteredRows.length; index += 1) {
      const row = filteredRows[index];
      console.log(`[${index + 1}/${filteredRows.length}] ${row.catedraNumero} - ${row.materiaNombre}`);
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

      const parsedHeader = parseHeading(detail.headingText, row);
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

    await fs.mkdir(options.outputDir, { recursive: true });
    const existing = await fs.readdir(options.outputDir);
    await Promise.all(
      existing
        .filter(file => file.endsWith('.json'))
        .map(file => fs.unlink(path.join(options.outputDir, file)))
    );
    await Promise.all(
      subjects.map(async subject => {
        const catedraMatch = subject.label.match(/Cátedra\s+(\d+)/i);
        const fileName = `${catedraMatch?.[1] || subject.id}.json`;
        await fs.writeFile(path.join(options.outputDir, fileName), `${JSON.stringify(subject, null, 2)}\n`, 'utf-8');
      })
    );
    console.log(`OK. Carpeta generada en: ${options.outputDir} (${subjects.length} archivos de materia).`);
  } finally {
    await page.close();
    await browser.close();
  }
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
