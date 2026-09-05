import { initDb, getDb } from './db';
import { createApp } from './createApp';

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Initialize database
initDb();

// Create app bound to database
const app = createApp(getDb());

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Reflex API running on http://${HOST}:${PORT}`);
});

export default app;
