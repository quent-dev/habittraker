import { Router } from 'express';
import { HabitService } from '../services/HabitService';

const router = Router();
const habitService = new HabitService();

// Get all habits
router.get('/', async (req, res, next) => {
    try {
        const habits = await habitService.listHabits();
        res.json(habits);
    } catch (error) {
        next(error);
    }
});

// Get a single habit
router.get('/:id', async (req, res, next) => {
    try {
        const habit = await habitService.getHabit(Number(req.params.id));
        if (!habit) {
            return res.status(404).json({ error: 'Habit not found' });
        }
        res.json(habit);
    } catch (error) {
        next(error);
    }
});

// Create a new habit
router.post('/', async (req, res, next) => {
    try {
        const habit = await habitService.createHabit(req.body);
        res.status(201).json(habit);
    } catch (error) {
        next(error);
    }
});

// Archive a habit
router.delete('/:id', async (req, res, next) => {
    try {
        await habitService.archiveHabit(Number(req.params.id));
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Record a habit completion
router.post('/:id/complete', async (req, res, next) => {
    try {
        const { count = 1 } = req.body;
        const completion = await habitService.recordCompletion(
            Number(req.params.id),
            count
        );
        res.status(201).json(completion);
    } catch (error) {
        next(error);
    }
});

// Get habit streak
router.get('/:id/streak', async (req, res, next) => {
    try {
        const streak = await habitService.getStreak(Number(req.params.id));
        if (!streak) {
            return res.status(404).json({ error: 'Streak not found' });
        }
        res.json(streak);
    } catch (error) {
        next(error);
    }
});

export const habitRoutes = router; 