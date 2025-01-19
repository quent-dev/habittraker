import express from 'express';
import { json } from 'body-parser';
import { habitRoutes } from './routes/habitRoutes';
import { completionRoutes } from './routes/completionRoutes';
import { initializeDatabase } from './db/database';

const app = express();

// Middleware
app.use(json());

// Routes
app.use('/api', completionRoutes);
app.use('/api/habits', habitRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app; 