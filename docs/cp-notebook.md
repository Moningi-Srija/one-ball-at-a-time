# CP Notebook: one master, one generated website snapshot

The master remains outside this repository at:

- `/Users/srija/Documents/CP-Notebook-Draft/cp-notes.json`
- `/Users/srija/Documents/CP-Notebook-Draft/cp-notes.schema.json`
- `/Users/srija/Documents/CP-Notebook-Draft/cp-notes-preview.html` (readable authoring preview, not deployed)

The study chat edits only the master JSON. The website reads the generated
`data/cp-notes.public.json`; do not hand-edit that file or maintain a second set
of cards in JavaScript. There is no Notion connection or runtime database write.

## Preview and publication boundary

Importing creates a **local snapshot**. It does not commit, push, deploy, or
publish anything. Publishing a new snapshot needs the owner's approval,
including approval to make the filtered study content public.
The generated snapshot is designed for public delivery and is shared by the
private app and public demo; it contains no owner-only ideas.

## Repeatable update workflow

From the website repository:

```sh
npm ci
npm run import:cp -- --source /Users/srija/Documents/CP-Notebook-Draft/cp-notes.json --schema /Users/srija/Documents/CP-Notebook-Draft/cp-notes.schema.json
npm test
git diff --check
git status --short
git diff -- data/cp-notes.public.json
```

For an initial untracked snapshot, `git diff` will not show it; inspect the JSON
and local browser preview directly before staging anything. Start the isolated
demo without loading the private server or database:

```sh
npm run preview:cp
```

Open `http://127.0.0.1:8795/demo?tab=cp-notebook` to inspect the cards. Stop the
preview with Ctrl-C when finished. The website's Refresh button
loads the latest imported snapshot; it **does not read files on your Mac**.

Check whether the local generated file matches the current master without
rewriting it:

```sh
npm run import:cp -- --source /Users/srija/Documents/CP-Notebook-Draft/cp-notes.json --schema /Users/srija/Documents/CP-Notebook-Draft/cp-notes.schema.json --check
```

The check exits 0 if current and 1 if stale or invalid. An unchanged import keeps
its existing timestamp and produces no content diff. A valid changed import is
written atomically. Failed validation or privacy checks leave the last valid
snapshot untouched. The importer never changes the master JSON or its schema.

### Publishing later, only after approval

Once the owner approves publication, commit the code and generated public JSON,
push to the deployment branch, and wait for a successful deployment. Automatic
deployment depends on the service's settings; a Git push alone is not proof that
production updated. After successful deployment, open CP Notebook and Refresh.

There is no separate frontend compilation step for this static JSON, but the new
snapshot **must reach the running service through deployment**. Editing the
master, importing locally, refreshing the live website, or waiting a day cannot
update production by themselves. The Mac's master path is never needed on Render.

## Import contract and privacy

- JSON Schema 2020-12 validation runs before output. The checked-in schema is the
  supported website contract; a future master-schema change requires a deliberate
  importer update, not silent acceptance of unknown fields.
- Every ID must be unique, including archived entries. Keep the same ID when
  changing wording; do not recycle an old ID for an unrelated insight.
- `archived: true` and `needs-review` entries are excluded from the generated
  JSON itself, not merely hidden in the page. Archiving removes an existing card
  on the next import and deployment. Missing entries are likewise removed.
- Only `id`, `title`, `takeaway`, `details`, `tags`, `code`, `language`, and
  `sourceUrl` are emitted. `original` is not published. The original wording
  remains available in the private master and authoring preview.
- The trailing `Original wording provenance:` / `Saved-note sources:` sections
  are removed from details. Unexpected remaining private references in any
  outgoing text/code field fail the import instead of being silently exposed.
- Source links are limited to recognized public problem/article paths on
  LeetCode, Codeforces, AtCoder, Take U Forward, AlgoMonster, and YouTube. Private
  Notion URLs, account/authentication paths, unknown hosts, and credentials are
  omitted. Query strings and fragments are stripped, except a valid YouTube
  video ID; unlisted videos should not be supplied as public sources.
- The importer uses a conservative private-link/identifier check. If it blocks
  a legitimate code constant or reference, review it explicitly rather than
  disabling the safety check for the whole collection.
- The UI must render imported text with text nodes and code in `pre`/`code`,
  never execute it or interpret it as HTML. Mathematical `<` characters,
  indentation, and line breaks remain literal.
- Counts and an import timestamp are the only generated metadata; no local
  source path, Notion page ID, internal citation trail, or authoring metadata is
  included in the browser payload.

The import sanitization is a publication safeguard, not a claim that every
remaining technical idea has been independently reviewed. Review and tag doubtful
material `needs-review` in the master before releasing a snapshot.
