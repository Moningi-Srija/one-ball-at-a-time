#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const { validatePayload } = require('../cp-notebook');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SCHEMA = path.join(ROOT, 'schemas/cp-notes.schema.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'data/cp-notes.public.json');
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const PROVENANCE_START = /^[ \t]*(?:Original wording provenance|Saved-note sources)\s*:/im;
// Fail closed if a private source reference survives the explicit projection.
// These checks run on every outgoing string, not just on sourceUrl.
const PRIVATE_REFERENCE = /notion\.(?:so|com|site)|(?:original wording\s+)?provenance\s*:|saved-note sources\s*:|(?:chatgpt\.com|chat\.openai\.com)\/(?:c|g)\/|codex:\/\/|(?:\/Users\/|file:\/\/)|\b[0-9a-f]{32}\b|\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/i;

function readJson(filePath, maxBytes = MAX_INPUT_BYTES) {
  let input;
  try {
    if (fs.statSync(filePath).size > maxBytes) throw new Error('oversized');
    input = fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new Error('Could not read a notebook input file, or it exceeds the size limit.');
  }
  try {
    return JSON.parse(input);
  } catch {
    throw new Error('Notebook input must be valid JSON. No output was changed.');
  }
}

function safeSourceUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname;
  if (host === 'youtube.com' && pathname === '/watch') {
    const video = url.searchParams.get('v');
    return video && /^[A-Za-z0-9_-]{11}$/.test(video) ? `https://www.youtube.com/watch?v=${video}` : null;
  }
  if (host === 'youtu.be' && /^\/[A-Za-z0-9_-]{11}$/.test(pathname)) {
    return `https://youtu.be${pathname}`;
  }
  const allowed = (host === 'leetcode.com' && /^\/problems\/[a-z0-9-]+(?:\/(?:description|solutions|discuss))?\/?$/i.test(pathname))
    || (host === 'codeforces.com' && /^(?:\/problemset\/problem\/\d+\/[a-z0-9]+|\/(?:contest|gym)\/\d+\/problem\/[a-z0-9]+|\/blog\/entry\/\d+)\/?$/i.test(pathname))
    || (host === 'atcoder.jp' && /^\/contests\/[a-z0-9_-]+\/tasks\/[a-z0-9_-]+\/?$/i.test(pathname))
    || (host === 'takeuforward.org' && /^\/(?:practice\/dsa|prep-hub)\/[a-z0-9-]+\/?$/i.test(pathname))
    || (host === 'algo.monster' && /^\/liteproblems\/\d+\/?$/.test(pathname));
  if (!allowed) return null;
  // Never forward query tokens, tracking parameters, fragments or credentials.
  return `https://${host}${pathname}`;
}

function publicDetails(value) {
  const match = PROVENANCE_START.exec(value);
  return (match ? value.slice(0, match.index) : value).trim();
}

function assertNoPrivateReferences(note, index) {
  for (const [field, value] of Object.entries(note)) {
    const values = Array.isArray(value) ? value : [value];
    const unsafe = values.some(item => {
      if (typeof item !== 'string') return false;
      if (PRIVATE_REFERENCE.test(item)) return true;
      return [...item.matchAll(/https?:\/\/[^\s<>"`]+/gi)].some(match => {
        const link = match[0].replace(/[),.;]+$/, '');
        // Do not retain tracking/auth query strings embedded in prose or code:
        // those cannot be rewritten safely without changing the author's text.
        return safeSourceUrl(link) !== link;
      });
    });
    if (unsafe) {
      // Do not echo the confidential value or even the user-provided note ID.
      throw new Error(`Private reference remains in note ${index + 1}, field ${field}. Review the master before importing.`);
    }
  }
}

function buildPublicNotebook(master, schema, now = new Date()) {
  let validate;
  try {
    const ajv = new Ajv2020({ strict: true, allErrors: false });
    validate = ajv.compile(schema);
  } catch {
    throw new Error('Notebook schema is invalid or unsupported. No output was changed.');
  }
  if (!validate(master)) {
    const error = validate.errors[0];
    throw new Error(`Notebook validation failed at ${error.instancePath || '/'} (${error.keyword}). No output was changed.`);
  }
  // The committed schema is the supported contract even when --schema points
  // to a future master schema. Do not silently weaken public-output validation.
  if (master.schemaVersion !== 1 || !Array.isArray(master.notes)) {
    throw new Error('Unsupported notebook schema version. No output was changed.');
  }
  const baseline = new Ajv2020({ strict: true, allErrors: false }).compile(readJson(DEFAULT_SCHEMA, 256 * 1024));
  if (!baseline(master)) throw new Error('Master schema differs from the supported notebook contract. Update and review the importer first.');
  const ids = new Set();
  const notes = [];
  const counts = { total: master.notes.length, archived: 0, needsReview: 0, omittedSourceLinks: 0 };
  master.notes.forEach((note, index) => {
    if (ids.has(note.id)) throw new Error(`Duplicate stable ID in note ${index + 1}. No output was changed.`);
    ids.add(note.id);
    if (note.archived) { counts.archived += 1; return; }
    // Review status is visible context, not a privacy exclusion. Preserve the
    // tag and its caveat while applying the same public projection/checks.
    if (note.tags.includes('needs-review')) counts.needsReview += 1;
    const projected = {
      id: note.id,
      title: note.title,
      takeaway: note.takeaway,
      details: publicDetails(note.details),
      tags: [...note.tags],
      code: note.code,
      language: note.language,
      sourceUrl: safeSourceUrl(note.sourceUrl),
    };
    if (note.sourceUrl && !projected.sourceUrl) counts.omittedSourceLinks += 1;
    assertNoPrivateReferences(projected, index);
    notes.push(projected);
  });
  const generatedAt = new Date(now).toISOString();
  const data = { schemaVersion: 1, generatedAt, notes };
  // Match the browser's semantic contract as well as the supplied JSON schema.
  // For example, minLength alone accepts an all-whitespace title or language.
  try { validatePayload(data); } catch {
    throw new Error('Generated notebook does not meet the display contract. Check nonblank titles, takeaways and code languages, and keep at most 10,000 visible ideas. No output was changed.');
  }
  return { data, counts: { ...counts, included: notes.length } };
}

function sameContent(previous, next) {
  if (!previous || typeof previous !== 'object' || Array.isArray(previous)) return false;
  const { generatedAt, ...content } = previous;
  return typeof generatedAt === 'string' && Number.isFinite(Date.parse(generatedAt))
    && JSON.stringify(content) === JSON.stringify({ schemaVersion: next.schemaVersion, notes: next.notes });
}

function resolvedFile(filePath) {
  const absolute = path.resolve(filePath);
  return fs.existsSync(absolute) ? fs.realpathSync(absolute) : absolute;
}

function importNotebook({ sourcePath, schemaPath = DEFAULT_SCHEMA, outputPath = DEFAULT_OUTPUT, check = false, now = new Date() }) {
  if (!sourcePath) throw new Error('Provide --source with the master cp-notes.json path.');
  const resolvedOutput = resolvedFile(outputPath);
  if ([sourcePath, schemaPath, DEFAULT_SCHEMA].some(input => resolvedFile(input) === resolvedOutput)) {
    throw new Error('The output must not overwrite the master or schema.');
  }
  if (fs.existsSync(outputPath) && fs.lstatSync(outputPath).isSymbolicLink()) {
    throw new Error('Refusing to replace a symlink as the generated output.');
  }
  const { data, counts } = buildPublicNotebook(readJson(sourcePath), readJson(schemaPath, 256 * 1024), now);
  let previous = null;
  if (fs.existsSync(outputPath)) {
    try { previous = JSON.parse(fs.readFileSync(outputPath, 'utf8')); } catch { /* replace only after validated import */ }
  }
  const unchanged = sameContent(previous, data);
  if (check || unchanged) return { ...counts, changed: !unchanged, check };
  const directory = path.dirname(path.resolve(outputPath));
  fs.mkdirSync(directory, { recursive: true });
  const temporaryDirectory = fs.mkdtempSync(path.join(directory, '.cp-notes-import-'));
  const temporaryFile = path.join(temporaryDirectory, 'snapshot.json');
  try {
    fs.writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporaryFile, outputPath);
  } finally {
    if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
    fs.rmdirSync(temporaryDirectory);
  }
  return { ...counts, changed: true, check: false };
}

function cliArguments(args) {
  const options = {};
  const values = { '--source': 'sourcePath', '--schema': 'schemaPath', '--output': 'outputPath' };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--check') { options.check = true; continue; }
    if (!values[flag] || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Use --source PATH [--schema PATH] [--output PATH] [--check].');
    if (options[values[flag]]) throw new Error('Each import option may only be supplied once.');
    options[values[flag]] = args[++index];
  }
  return options;
}

if (require.main === module) {
  try {
    const result = importNotebook(cliArguments(process.argv.slice(2)));
    console.log(`CP Notebook: ${result.included} included (${result.needsReview} flagged needs-review); ${result.archived} archived excluded; ${result.omittedSourceLinks} source links omitted.`);
    console.log(result.check ? (result.changed ? 'Generated snapshot is out of date. Run the import before previewing or deploying.' : 'Generated snapshot is current.') : (result.changed ? 'Generated local snapshot updated. Nothing was committed, deployed or published.' : 'No content changes. Existing timestamp preserved.'));
    if (result.check && result.changed) process.exitCode = 1;
  } catch (error) {
    console.error(`CP Notebook import failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildPublicNotebook, importNotebook, publicDetails, safeSourceUrl, sameContent, cliArguments };
