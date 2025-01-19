import { Router } from 'express';
import { HabitService } from '../services/HabitService';

const router = Router();
const habitService = new HabitService();

// Get all completions for a habit
router.get('/habits/:habitId/completions', async (req, res, next) => {
    try {
        const completions = await habitService.getCompletions(Number(req.params.habitId));
        res.json(completions);
    } catch (error) {
        next(error);
    }
});

// Get completions for a date range
router.get('/habits/:habitId/completions/range', async (req, res, next) => {
    try {
        const { start, end } = req.query;
        const completions = await habitService.getCompletionsInRange(
            Number(req.params.habitId),
            new Date(start as string),
            new Date(end as string)
        );
        res.json(completions);
    } catch (error) {
        next(error);
    }
});

// Delete a completion
router.delete('/completions/:completionId', async (req, res, next) => {
    try {
        await habitService.deleteCompletion(Number(req.params.completionId));
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export const completionRoutes = router; 