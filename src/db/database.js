import Dexie from 'dexie';
import { initialData } from './seedData.js';

// Initialize the IndexedDB Database Instance
export const db = new Dexie('MyAACDatabase');

// Define the Schema
// We only declare the "Primary Keys" (like id). Dexie allows objects to have
// any dynamic properties (like custom images) without strict schema definitions.

db.version(1).stores({
    settings: 'id', // Stores global app configuration
    boards: 'id' // Stores our communication boards and their nested tiles
});

// The initialization Function
// This checks if the tablet already has data. If it's a first-time boot,
// it populates the database using your perfect seedData file.

export async function initializeDatabase() {
    try {
        // Check if we already have boards stored locally
        const boardCount = await db.boards.count();

        if (boardCount === 0) {
            console.log("No existing database found. Seeding initial AAC layouts...");

            // Store the global settings block
            await db.settings.put({
                id: 'app_settings',
                defaultBoardId: initialData.defaultBoardId
            });

            // Loop through each board in seedData and save it to the local browser database
            const boardKeys = Object.keys(initialData.boards);
            for (const key of boardKeys) {
                await db.boards.put(initialData.boards[key]);
            }

            console.log("Database successfully seeded offline!");
        } else {
            console.log(`Database verified. Loaded ${boardCount} communication boards from local browser storage.`);
        }
    } catch (error) {
        console.error("Failed to initialize offline browser database:", error);
    }
}