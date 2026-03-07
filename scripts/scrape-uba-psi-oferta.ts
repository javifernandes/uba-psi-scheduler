#!/usr/bin/env node

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

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const stripTags = (value: string) =>
  decodeEntities(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

const fetchHtml = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url} (HTTP ${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const decoder = new TextDecoder('latin1');
  return decoder.decode(bytes);
};

const extractPanelHtml = (catalogHtml: string, code: string) => {
  const openTag = `<div id="${code}"`;
  const start = catalogHtml.indexOf(openTag);
  if (start < 0) return '';

  const otherCodes = CAREERS.map(career => career.code).filter(item => item !== code);
  const nextStarts = otherCodes
    .map(other => catalogHtml.indexOf(`<div id="${other}"`, start + openTag.length))
    .filter(index => index > start)
    .sort((a, b) => a - b);
  const end = nextStarts[0] ?? catalogHtml.indexOf('</div></div></div><style', start);

  if (end < 0) return catalogHtml.slice(start);
  return catalogHtml.slice(start, end);
};

const extractRowsFromPanel = (panelHtml: string, baseUrl: string): CatalogRow[] => {
  const trMatches = panelHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const rows: CatalogRow[] = [];

  trMatches.forEach(tr => {
    const tdMatches = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tdMatches.length < 3) return;

    const hrefMatch = tr.match(/href\s*=\s*"([^"]*Ver154_\.php\?catedra=[^"]+)"/i);
    if (!hrefMatch?.[1]) return;

    const url = new URL(hrefMatch[1], baseUrl).href;
    const catedraNumero = stripTags(tdMatches[0] || '');
    const materiaNombre = stripTags(tdMatches[1] || '');
    const catedraTexto = stripTags(tdMatches[2] || '');

    if (!catedraNumero || !materiaNombre) return;

    rows.push({ catedraNumero, materiaNombre, catedraTexto, url });
  });

  return Array.from(new Map(rows.map(item => [item.url, item])).values());
};

const parseTableRows = (tableHtml: string, sectionMatchers: string[]): SectionRow[] | null => {
  const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  if (trMatches.length < 2) return null;

  const headerCells = (trMatches[0]?.match(/<(?:th|td)[\s\S]*?<\/(?:th|td)>/gi) || []).map(cell =>
    normalizeKey(stripTags(cell))
  );
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

  return trMatches
    .slice(1)
    .map(tr => (tr.match(/<td[\s\S]*?<\/td>/gi) || []).map(cell => stripTags(cell)))
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

const parseDetail = (html: string): DetailData => {
  const headingText =
    stripTags(html.match(/Listado horarios de cátedra[^<\n]*/i)?.[0] || '') ||
    stripTags(html.match(/<h[1-3][\s\S]*?<\/h[1-3]>/i)?.[0] || '');

  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
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
};

const main = async () => {
  const options = parseArgs();

  console.log(`Abriendo catálogo: ${DEFAULT_CATALOG_URL}`);
  const catalogHtml = await fetchHtml(DEFAULT_CATALOG_URL);

  const careersFromCatalog: CatalogCareer[] = options.careers.map(career => {
    const panelHtml = extractPanelHtml(catalogHtml, career.code);
    const rows = extractRowsFromPanel(panelHtml, DEFAULT_CATALOG_URL);
    return {
      code: career.code,
      label: career.label,
      rows,
    };
  });

  const careersToProcess = careersFromCatalog.map(career => {
    const config = options.careers.find(item => item.code === career.code);
    if (!config) return null;
    return {
      ...config,
      rows: career.rows.slice(0, options.limit ?? career.rows.length),
      totalRows: career.rows.length,
    };
  }).filter((item): item is CareerConfig & { rows: CatalogRow[]; totalRows: number } => Boolean(item));

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
      console.log(`[${career.code}] [${index + 1}/${total}] ${row.catedraNumero} - ${row.materiaNombre}`);
      const detailHtml = await fetchHtml(row.url);
      const detail = parseDetail(detailHtml);

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

      await sleep(100);
    }

    const careerDir = path.join(options.outputDir, career.slug, 'materias');
    await fs.mkdir(careerDir, { recursive: true });
    const existing = await fs.readdir(careerDir).catch(() => [] as string[]);
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
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
