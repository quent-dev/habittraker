import { Database } from 'sqlite';
import { Habit, HabitStreak } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { getDatabase } from '../db/database';

export class HabitService {
    private db: Database | null = null;

    private async getDb(): Promise<Database> {
        if (!this.db) {
            this.db = await getDatabase();
        }
        return this.db;
    }

    async createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<Habit> {
        const db = await this.getDb();
        const result = await db.run(`
            INSERT INTO habits (
                name, description, icon, color, 
                target_count, target_type, target_units
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            habit.name,
            habit.description,
            habit.icon,
            habit.color,
            habit.target_count,
            habit.target_type,
            habit.target_units
        ]);

        return {
            ...habit,
            id: result.lastID,
            created_at: new Date()
        };
    }

    async getHabit(id: number): Promise<Habit | null> {
        const db = await this.getDb();
        return db.get<Habit>('SELECT * FROM habits WHERE id = ?', [id]);
    }

    async listHabits(): Promise<Habit[]> {
        const db = await this.getDb();
        return db.all<Habit[]>('SELECT * FROM habits WHERE archived_at IS NULL');
    }

    async archiveHabit(id: number): Promise<void> {
        const db = await this.getDb();
        await db.run(
            'UPDATE habits SET archived_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    }

    async recordCompletion(
        habitId: number,
        count: number = 1
    ): Promise<HabitCompletion> {
        const db = await this.getDb();
        const result = await db.run(
            `INSERT INTO habit_completions (habit_id, count) VALUES (?, ?)`,
            [habitId, count]
        );

        await this.updateStreak(habitId);

        return {
            id: result.lastID,
            habit_id: habitId,
            count,
            completed_at: new Date()
        };
    }

    private async updateStreak(habitId: number): Promise<void> {
        // This is a simplified streak calculation
        // In a real application, you'd need more complex logic based on target_type
        const db = await this.getDb();
        const habit = await this.getHabit(habitId);
        
        if (!habit) return;

        const completions = await db.all<HabitCompletion[]>(
            `SELECT * FROM habit_completions 
             WHERE habit_id = ? 
             ORDER BY completed_at DESC`,
            [habitId]
        );

        // Simple streak calculation (assumes daily habits)
        let currentStreak = 0;
        let previousDate = new Date();

        for (const completion of completions) {
            const completionDate = new Date(completion.completed_at!);
            const diffDays = Math.floor(
                (previousDate.getTime() - completionDate.getTime()) 
                / (1000 * 60 * 60 * 24)
            );

            if (diffDays <= 1) {
                currentStreak++;
                previousDate = completionDate;
            } else {
                break;
            }
        }

        await db.run(`
            INSERT INTO habit_streaks (
                habit_id, current_streak, last_completed_at
            ) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(habit_id) DO UPDATE SET 
                current_streak = ?,
                longest_streak = MAX(longest_streak, ?),
                last_completed_at = CURRENT_TIMESTAMP
        `, [habitId, currentStreak, currentStreak, currentStreak]);
    }

    async getStreak(habitId: number): Promise<HabitStreak | null> {
        const db = await this.getDb();
        return db.get<HabitStreak>(
            'SELECT * FROM habit_streaks WHERE habit_id = ?',
            [habitId]
        );
    }
} 