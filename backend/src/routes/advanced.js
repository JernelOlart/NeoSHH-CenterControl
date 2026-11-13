import { Router } from 'express';
import { getServerById } from '../db.js';
import {
  getLiveMetrics,
  getSystemServices,
  serviceAction,
  getSystemLogs,
  getCronJobs,
  saveCronJob,
  getPackages,
  runPackageCommand,
  getNetworkInfo,
  findDockerComposeFiles,
  getDockerComposeContent,
  dockerComposeAction,
  getDockerStats,
  getNginxSites,
  getNginxSiteContent,
  saveNginxSite,
  runSSHCommand
} from '../services/advancedSSH.js';

const router = Router();

// Helper to fetch server with credentials or return 404
function getServerOr404(req, res) {
  const server = getServerById(req.params.id, true);
  if (!server) {
    res.status(404).json({ error: 'Servidor no encontrado' });
    return null;
  }
  return server;
}

// ---------------------------------------------------------------------------
// 1. GET /api/servers/:id/metrics/live -> getLiveMetrics
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/metrics/live', '/:id/metrics/live', '/servers/:id/metrics/live'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const metrics = await getLiveMetrics(server);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/servers/:id/services -> getSystemServices
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/services', '/:id/services', '/servers/:id/services'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getSystemServices(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. POST /api/servers/:id/services/action -> serviceAction
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/services/action', '/:id/services/action', '/servers/:id/services/action'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { serviceName, action } = req.body || {};
    const result = await serviceAction(server, serviceName, action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /api/servers/:id/logs -> getSystemLogs
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/logs', '/:id/logs', '/servers/:id/logs'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { source = 'syslog', lines = 100, filter = '' } = req.query;
    const result = await getSystemLogs(server, source, parseInt(lines, 10) || 100, filter);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /api/servers/:id/cron -> getCronJobs
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/cron', '/:id/cron', '/servers/:id/cron'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getCronJobs(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /api/servers/:id/cron -> saveCronJob
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/cron', '/:id/cron', '/servers/:id/cron'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { cronExpression, command, operation = 'add', originalLine = '' } = req.body || {};
    const result = await saveCronJob(server, cronExpression, command, operation, originalLine);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. GET /api/servers/:id/packages -> getPackages
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/packages', '/:id/packages', '/servers/:id/packages'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getPackages(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /api/servers/:id/packages/command -> runPackageCommand
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/packages/command', '/:id/packages/command', '/servers/:id/packages/command'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { action, packageName = '' } = req.body || {};
    const result = await runPackageCommand(server, action, packageName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 9. GET /api/servers/:id/network -> getNetworkInfo
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/network', '/:id/network', '/servers/:id/network'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getNetworkInfo(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 10. GET /api/servers/:id/compose/files -> findDockerComposeFiles
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/compose/files', '/:id/compose/files', '/servers/:id/compose/files'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await findDockerComposeFiles(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 11. GET /api/servers/:id/compose/content -> getDockerComposeContent
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/compose/content', '/:id/compose/content', '/servers/:id/compose/content'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const filePath = req.query.filePath || req.query.path || '';
    const result = await getDockerComposeContent(server, filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 12. POST /api/servers/:id/compose/action -> dockerComposeAction
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/compose/action', '/:id/compose/action', '/servers/:id/compose/action'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { filePath, action } = req.body || {};
    const result = await dockerComposeAction(server, filePath, action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 13. GET /api/servers/:id/docker/stats -> getDockerStats
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/docker/stats', '/:id/docker/stats', '/servers/:id/docker/stats'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getDockerStats(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 14. GET /api/servers/:id/nginx -> getNginxSites
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/nginx', '/:id/nginx', '/servers/:id/nginx'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const result = await getNginxSites(server);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 15. GET /api/servers/:id/nginx/site -> getNginxSiteContent
// ---------------------------------------------------------------------------
router.get(['/api/servers/:id/nginx/site', '/:id/nginx/site', '/servers/:id/nginx/site'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const siteName = req.query.siteName || req.query.name || '';
    const result = await getNginxSiteContent(server, siteName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 16. POST /api/servers/:id/nginx/site -> saveNginxSite
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/nginx/site', '/:id/nginx/site', '/servers/:id/nginx/site'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { sitePath, content } = req.body || {};
    const result = await saveNginxSite(server, sitePath, content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 17. POST /api/servers/:id/command -> runSSHCommand
// ---------------------------------------------------------------------------
router.post(['/api/servers/:id/command', '/:id/command', '/servers/:id/command'], async (req, res) => {
  try {
    const server = getServerOr404(req, res);
    if (!server) return;
    const { command } = req.body || {};
    const result = await runSSHCommand(server, command);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
