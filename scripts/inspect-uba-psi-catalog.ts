#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const DEFAULT_URL = 'http://academica.psi.uba.ar/Psi/Ope154_.php';
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), 'tmp/catalog-inspect');

type CliOptions = {
  url: string;
  outDir: string;
};

type ControlCandidate = {
  tag: 'a' | 'button' | 'input';
  text: string;
  href: string;
  onclick: string;
  name: string;
  value: string;
  id: string;
  className: string;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  let url = DEFAULT_URL;
  let outDir = DEFAULT_OUT_DIR;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) {
      url = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--out-dir' && args[i + 1]) {
      outDir = path.resolve(args[i + 1]);
      i += 1;
      continue;
    }
  }

  return { url, outDir };
};

const clean = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const attr = (chunk: string, name: string) => {
  const match = chunk.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1]?.trim() || '';
};

const extractControlCandidates = (html: string): ControlCandidate[] => {
  const candidates: ControlCandidate[] = [];

  const anchorRegex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  const buttonRegex = /<button\b[^>]*>[\s\S]*?<\/button>/gi;
  const inputRegex = /<input\b[^>]*>/gi;

  const anchors = html.match(anchorRegex) || [];
  anchors.forEach(chunk => {
    const text = clean(chunk);
    if (!text) return;
    candidates.push({
      tag: 'a',
      text,
      href: attr(chunk, 'href'),
      onclick: attr(chunk, 'onclick'),
      name: attr(chunk, 'name'),
      value: attr(chunk, 'value'),
      id: attr(chunk, 'id'),
      className: attr(chunk, 'class'),
    });
  });

  const buttons = html.match(buttonRegex) || [];
  buttons.forEach(chunk => {
    const text = clean(chunk);
    if (!text) return;
    candidates.push({
      tag: 'button',
      text,
      href: '',
      onclick: attr(chunk, 'onclick'),
      name: attr(chunk, 'name'),
      value: attr(chunk, 'value'),
      id: attr(chunk, 'id'),
      className: attr(chunk, 'class'),
    });
  });

  const inputs = html.match(inputRegex) || [];
  inputs.forEach(chunk => {
    const type = attr(chunk, 'type').toLowerCase();
    if (!['button', 'submit', 'radio'].includes(type)) return;
    const text = clean(attr(chunk, 'value'));
    if (!text) return;
    candidates.push({
      tag: 'input',
      text,
      href: '',
      onclick: attr(chunk, 'onclick'),
      name: attr(chunk, 'name'),
      value: attr(chunk, 'value'),
      id: attr(chunk, 'id'),
      className: attr(chunk, 'class'),
    });
  });

  return candidates;
};

const main = async () => {
  const options = parseArgs();
  await fs.mkdir(options.outDir, { recursive: true });

  console.log(`Descargando catálogo: ${options.url}`);
  const response = await fetch(options.url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar catálogo (HTTP ${response.status})`);
  }
  const html = await response.text();

  const htmlPath = path.join(options.outDir, '00-catalog.html');
  await fs.writeFile(htmlPath, html, 'utf8');

  const allControls = extractControlCandidates(html);
  const likelyCareerControls = allControls.filter(item =>
    /lic|music|terapia|profesorado|carrera|psicologia/i.test(item.text)
  );

  await fs.writeFile(
    path.join(options.outDir, '01-controls-all.json'),
    `${JSON.stringify(allControls, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(options.outDir, '02-controls-career-likely.json'),
    `${JSON.stringify(likelyCareerControls, null, 2)}\n`,
    'utf8'
  );

  console.log(`Listo. Artefactos en: ${options.outDir}`);
  console.log('- 00-catalog.html');
  console.log('- 01-controls-all.json');
  console.log('- 02-controls-career-likely.json');
  console.log(`Controles detectados: ${allControls.length}`);
  console.log(`Controles "carrera" probables: ${likelyCareerControls.length}`);
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

