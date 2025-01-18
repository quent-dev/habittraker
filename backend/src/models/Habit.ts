export interface Habit {
    id?: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    created_at?: Date;
    archived_at?: Date | null;
    target_count: number;
    target_type: 'daily' | 'weekly' | 'monthly';
    target_units: string;
}

export interface HabitStreak {
    habit_id: number;
    current_streak: number;
    longest_streak: number;
    last_completed_at: Date | null;
} 