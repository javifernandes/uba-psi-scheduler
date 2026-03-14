import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

type ServerContext = {
  baseUrl: string;
  close: () => Promise<void>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const PERIOD = '2026-01';

const seedPreviousDataset = async (outputDir: string, subjects = 10) => {
  const periodDir = path.join(outputDir, PERIOD);
  const subjectPath = path.join(periodDir, 'lic-psicologia', 'materias', '34.json');
  await fs.mkdir(path.dirname(subjectPath), { recursive: true });

  const previousSubject = {
    schemaVersion: 2,
    id: 'old-subject',
    label: '(1) Historia - Cátedra 34 (I)',
    header: 'header',
    slots: [
      {
        id: '21',
        tipo: 'prac',
        dia: 'jueves',
        inicio: '14:30',
        fin: '16:00',
        profesor: 'Docente',
        lugar: {
          anexo: 'IN',
          aula: '444',
        },
        vacantes: 35,
        slotsAsociados: [],
      },
    ],
  };

  await fs.writeFile(subjectPath, `${JSON.stringify(previousSubject, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(periodDir, 'careers.generated.json'),
    `${JSON.stringify(
      [{ code: 'PS', slug: 'lic-psicologia', label: 'Licenciatura en Psicología', subjects }],
      null,
      2
    )}\n`,
    'utf8'
  );

  return { subjectPath, previousSubjectRaw: `${JSON.stringify(previousSubject, null, 2)}\n` };
};

const catalogHtml = () => `<!doctype html>
<html>
  <body>
    <h1>Horarios a cursos 2026 / 1</h1>
    <div id="PS">
      <table>
        <tr><th>Cátedra</th><th>Materia</th><th>Cátedra</th></tr>
        <tr>
          <td>34</td>
          <td>Historia de la Psicología</td>
          <td>I - Docente <a href="/Psi/Ver154_.php?catedra=34">Ver</a></td>
        </tr>
      </table>
    </div>
    <div id="PR"></div>
    <div id="LM"></div>
    <div id="TE"></div>
  </body>
</html>`;

const detailHtml = () => `<!doctype html>
<html>
  <body>
    <h2>Listado horarios de cátedra 34 - I - Prof. Docente* Materia (1 - Historia)</h2>
    <table>
      <tr>
        <th>Comisiones</th>
        <th>Dia</th>
        <th>Inicio</th>
        <th>Fin</th>
        <th>Profesor</th>
        <th>Oblig.</th>
        <th>Aula</th>
        <th>Observ.</th>
        <th>Vac.</th>
      </tr>
      <tr>
        <td>21</td>
        <td>jueves</td>
        <td>14:30</td>
        <td>16:00</td>
        <td>Docente, Uno</td>
        <td>I</td>
        <td>IN-444</td>
        <td></td>
        <td>35</td>
      </tr>
    </table>
  </body>
</html>`;

const startServer = async (mode: 'detail_500' | 'detail_ok'): Promise<ServerContext> => {
  const server = http.createServer((req, res) => {
    const url = req.url || '';
    if (url.startsWith('/Psi/Ope154_.php')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=latin1' });
      res.end(catalogHtml());
      return;
    }
    if (url.startsWith('/Psi/Ver154_.php?catedra=34')) {
      if (mode === 'detail_500') {
        res.writeHead(500, { 'content-type': 'text/plain; charset=latin1' });
        res.end('boom');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=latin1' });
      res.end(detailHtml());
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=latin1' });
    res.end('not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de test.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

const runScraper = async (args: string[]) => {
  const fullArgs = ['run', 'scrape:catalog', '--', ...args];

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn('npm', fullArgs, {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
    }
  );

  return result;
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((target) => fs.rm(target, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('scrape-uba-psi-oferta robustness', () => {
  it('preserva dataset vigente si falla el scrape de detalle', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scrape-psi-fail-'));
    tempDirs.push(outputDir);
    const { subjectPath, previousSubjectRaw } = await seedPreviousDataset(outputDir, 10);
    const server = await startServer('detail_500');

    try {
      const result = await runScraper([
        '--catalog-url',
        `${server.baseUrl}/Psi/Ope154_.php`,
        '--output-dir',
        outputDir,
        '--career',
        'PS',
        '--period',
        PERIOD,
      ]);

      expect(result.code).not.toBe(0);
      const afterRaw = await fs.readFile(subjectPath, 'utf8');
      expect(afterRaw).toBe(previousSubjectRaw);
    } finally {
      await server.close();
    }
  }, 30000);

  it('falla sanity <80% y no publica cambios sobre el período actual', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scrape-psi-sanity-'));
    tempDirs.push(outputDir);
    const { subjectPath, previousSubjectRaw } = await seedPreviousDataset(outputDir, 10);
    const server = await startServer('detail_ok');

    try {
      const result = await runScraper([
        '--catalog-url',
        `${server.baseUrl}/Psi/Ope154_.php`,
        '--output-dir',
        outputDir,
        '--career',
        'PS',
        '--period',
        PERIOD,
        '--min-ratio',
        '0.8',
      ]);

      expect(result.code).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('Sanity check falló');
      const afterRaw = await fs.readFile(subjectPath, 'utf8');
      expect(afterRaw).toBe(previousSubjectRaw);
    } finally {
      await server.close();
    }
  }, 30000);
});
