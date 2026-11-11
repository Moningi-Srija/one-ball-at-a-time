const { ProgressError } = require('./progress-store');

function registerProgressRoutes(app, requireAuth, store) {
  const handle = action => async (req, res) => {
    try {
      return res.json(await action(req));
    } catch (error) {
      if (error instanceof ProgressError) {
        return res.status(error.status).json({ error: error.code, message: error.message, ...error.details });
      }
      console.error('Progress request failed:', error);
      return res.status(500).json({ error: 'progress_request_failed', message: 'Could not save or load progress. Please try again.' });
    }
  };

  app.get('/api/progress', requireAuth, handle(async () => ({ trackers: await store.listTrackers() })));
  app.post('/api/progress', requireAuth, handle(async req => ({ tracker: await store.createTracker(req.body) })));
  app.patch('/api/progress/:id', requireAuth, handle(async req => ({ tracker: await store.updateTracker(req.params.id, req.body) })));
  app.post('/api/progress/:id/changes', requireAuth, handle(req => store.changeTracker(req.params.id, req.body)));
  app.delete('/api/progress/:id', requireAuth, handle(req => store.deleteTracker(req.params.id, req.body)));
  app.get('/api/progress/:id/history', requireAuth, handle(req => store.listHistory(req.params.id, req.query)));
}

module.exports = { registerProgressRoutes };
