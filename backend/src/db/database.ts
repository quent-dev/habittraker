import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
    if (db) return db;

    db = await open({
        filename: path.join(__dirname, '../../../data/habits.db'),
        driver: sqlite3.Database
    });

    await createTables();
    return db;
}

async function createTables(): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            archived_at TIMESTAMP,
            target_count INTEGER DEFAULT 1,
            target_type TEXT,
            target_units TEXT
        );

        CREATE TABLE IF NOT EXISTS habit_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            count INTEGER DEFAULT 1,
            FOREIGN KEY (habit_id) REFERENCES habits(id)
        );

        CREATE TABLE IF NOT EXISTS habit_streaks (
            habit_id INTEGER PRIMARY KEY,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_completed_at TIMESTAMP,
            FOREIGN KEY (habit_id) REFERENCES habits(id)
        );

        CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id 
            ON habit_completions(habit_id);
        CREATE INDEX IF NOT EXISTS idx_habit_completions_completed_at 
            ON habit_completions(completed_at);
    `);
}

export async function getDatabase(): Promise<Database> {
    if (!db) {
        return initializeDatabase();
    }
    return db;
} 