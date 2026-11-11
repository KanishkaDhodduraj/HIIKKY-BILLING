import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env, validateEnv } from './config/env.js';

validateEnv();
await connectDatabase();
createApp().listen(env.port, () => console.log(`HIIKKY Student API listening on ${env.port}`));
