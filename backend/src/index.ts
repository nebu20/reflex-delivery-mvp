import { initDb, getDb } from './db';
import { createApp } from './createApp';

const PORT = process.env.PORT || 3001;

// Initialize database
initDb();

// Create app bound to database
const app = createApp(getDb());

app.listen(PORT, () => {
  console.log(`🚀 Reflex API running on http://localhost:${PORT}`);
});

export default app;
