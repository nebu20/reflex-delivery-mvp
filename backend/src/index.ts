import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import deliveriesRouter from './routes/deliveries';
import { initDb } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// Routes
app.use('/api', healthRouter);
app.use('/api/deliveries', deliveriesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Reflex API running on http://localhost:${PORT}`);
});

export default app;
