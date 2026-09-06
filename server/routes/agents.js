import { Router } from 'express';
import db, { redactSecrets } from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const agents = db.prepare(`SELECT * FROM agents ORDER BY platform`).all();
  res.json(agents.map(a => ({ ...a, config_json: redactSecrets(a.config_json ?? '{}') })));
});

export default r;
