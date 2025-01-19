import { Database } from 'sqlite';
import { Habit, HabitStreak } from '../models/Habit';
import { HabitCompletion } from '../models/HabitCompletion';
import { getDatabase, toLocalDateTime } from '../db/database';

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
        const localDateTime = toLocalDateTime();
        
        const result = await db.run(`
            INSERT INTO habits (
                name, description, icon, color, 
                target_count, target_type, target_units,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            habit.name,
            habit.description,
            habit.icon,
            habit.color,
            habit.target_count,
            habit.target_type,
            habit.target_units,
            localDateTime
        ]);

        return {
            ...habit,
            id: result.lastID,
            created_at: new Date(localDateTime)
        };
    }

    async getHabit(id: number): Promise<Habit | null> {
        const db = await this.getDb();
        const habit = await db.get<Habit>('SELECT * FROM habits WHERE id = ?', [id]);
        return habit || null;  // Convert undefined to null
    }

    async listHabits(): Promise<Habit[]> {
        const db = await this.getDb();
        return db.all<Habit[]>('SELECT * FROM habits WHERE archived_at IS NULL') || [];
    }

    async archiveHabit(id: number): Promise<void> {
        const db = await this.getDb();
        const localDateTime = toLocalDateTime();
        
        await db.run(
            'UPDATE habits SET archived_at = ? WHERE id = ?',
            [localDateTime, id]
        );
    }

    async recordCompletion(
        habitId: number,
        count: number = 1
    ): Promise<HabitCompletion> {
        const db = await this.getDb();
        const localDateTime = toLocalDateTime();
        
        const result = await db.run(
            `INSERT INTO habit_completions (habit_id, count, completed_at) 
             VALUES (?, ?, ?)`,
            [habitId, count, localDateTime]
        );

        await this.updateStreak(habitId);

        return {
            id: result.lastID,
            habit_id: habitId,
            count,
            completed_at: new Date(localDateTime)
        };
    }

    private async updateStreak(habitId: number): Promise<void> {
        const db = await this.getDb();
        const habit = await this.getHabit(habitId);
        
        if (!habit) return;

        const completions = await db.all<HabitCompletion[]>(
            `SELECT * FROM habit_completions 
             WHERE habit_id = ? 
             ORDER BY completed_at DESC`,
            [habitId]
        );

        // Simple streak calculation using local dates
        let currentStreak = 0;
        let previousDate = new Date();
        previousDate.setHours(0, 0, 0, 0); // Start of today

        for (const completion of completions) {
            const completionDate = new Date(completion.completed_at!);
            completionDate.setHours(0, 0, 0, 0); // Start of completion day
            
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

        const localDateTime = toLocalDateTime();
        await db.run(`
            INSERT INTO habit_streaks (
                habit_id, current_streak, last_completed_at
            ) VALUES (?, ?, ?)
            ON CONFLICT(habit_id) DO UPDATE SET 
                current_streak = ?,
                longest_streak = MAX(longest_streak, ?),
                last_completed_at = ?
        `, [
            habitId, 
            currentStreak, 
            localDateTime,
            currentStreak,
            currentStreak,
            localDateTime
        ]);
    }

    async getStreak(habitId: number): Promise<HabitStreak | null> {
        const db = await this.getDb();
        const streak = await db.get<HabitStreak>(
            'SELECT * FROM habit_streaks WHERE habit_id = ?',
            [habitId]
        );
        
        if (!streak) return null;  // Convert undefined to null

        if (streak.last_completed_at) {
            // Convert UTC string to local timezone string
            const utcDate = new Date(streak.last_completed_at);
            streak.last_completed_at = new Date(
                utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000)
            );
        }
        
        return streak;
    }

    async getCompletions(habitId: number): Promise<HabitCompletion[]> {
        const db = await this.getDb();
        const completions = await db.all<HabitCompletion[]>(
            `SELECT * FROM habit_completions 
             WHERE habit_id = ? 
             ORDER BY completed_at DESC`,
            [habitId]
        );

        return completions.map(completion => ({
            ...completion,
            completed_at: completion.completed_at 
                ? new Date(completion.completed_at) 
                : undefined
        }));
    }

    async getCompletionsInRange(
        habitId: number, 
        startDate: Date, 
        endDate: Date
    ): Promise<HabitCompletion[]> {
        const db = await this.getDb();
        const startLocal = toLocalDateTime(startDate);
        const endLocal = toLocalDateTime(endDate);

        const completions = await db.all<HabitCompletion[]>(
            `SELECT * FROM habit_completions 
             WHERE habit_id = ? 
             AND completed_at BETWEEN ? AND ?
             ORDER BY completed_at DESC`,
            [habitId, startLocal, endLocal]
        );

        return completions.map(completion => ({
            ...completion,
            completed_at: completion.completed_at 
                ? new Date(completion.completed_at) 
                : undefined
        }));
    }

    async deleteCompletion(completionId: number): Promise<void> {
        const db = await this.getDb();
        
        // Get the habit_id before deleting
        const completion = await db.get<HabitCompletion>(
            'SELECT habit_id FROM habit_completions WHERE id = ?',
            [completionId]
        );

        if (!completion) {
            throw new Error('Completion not found');
        }

        await db.run(
            'DELETE FROM habit_completions WHERE id = ?',
            [completionId]
        );

        // Update streak after deletion
        await this.updateStreak(completion.habit_id);
    }
} 