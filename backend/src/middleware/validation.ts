import { Request, Response, NextFunction } from 'express';
import { Habit } from '../models/Habit';

export function validateHabit(req: Request, res: Response, next: NextFunction) {
    const habit = req.body as Partial<Habit>;

    if (!habit.name) {
        return res.status(400).json({ error: 'Habit name is required' });
    }

    if (!habit.target_type || !['daily', 'weekly', 'monthly'].includes(habit.target_type)) {
        return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!habit.target_count || habit.target_count < 1) {
        return res.status(400).json({ error: 'Invalid target count' });
    }

    if (!habit.target_units) {
        return res.status(400).json({ error: 'Target units are required' });
    }

    next();
} 