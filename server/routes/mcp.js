import { Router } from 'express';
import db, { redactSecrets } from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const servers = db.prepare(`SELECT * FROM mcp_servers ORDER BY name`).all();
  res.json(servers.map(s => ({
    ...s,
    config_json: redactSecrets(s.config_json ?? '{}')
  })));
});

export default r;
