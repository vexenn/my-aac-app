export const initialData = {
    // Global defaults for a new profile
    defaultBoardId: "root_core",

    boards: {
        // The Main Root Core Board
        "root_core": {
            id: "root_core",
            name: "Core Vocabulary",
            rows: 4,
            cols: 6,
            tiles: [
                // --- ROW 1: Pronouns & Social (Yellow & Pink) ---
                {
                    id: "tile_i",
                    label: "I",
                    speakValue: "I",
                    type: "action",
                    colorClass: "tile-pronoun", 
                    row: 1, col: 1,
                    masked: false
                },
                {
                    id: "tile_hello",
                    label: "Hello",
                    speakValue: "Hello, how are you?",
                    type: "action",
                    colorClass: "tile-social", 
                    row: 1, col: 6,
                    masked: false
                },

                // --- ROW 2: Verbs / Actions (Green) ---
                {
                    id: "tile_want",
                    label: "Want",
                    speakValue: "I want",
                    type: "action",
                    colorClass: "tile-verb", 
                    row: 2, col: 1,
                    masked: false
                },
                {
                    id: "tile_go",
                    label: "Go",
                    speakValue: "Go",
                    type: "action",
                    colorClass: "tile-verb", 
                    row: 2, col: 2,
                    masked: false
                },
                {
                    id: "tile_stop",
                    label: "Stop",
                    speakValue: "Stop",
                    type: "action",
                    colorClass: "tile-verb", 
                    row: 2, col: 3,
                    masked: false
                },

                // --- ROW 3: Categories / Folders (Orange / Blue / White) ---
                {
                    id: "tile_folder_food",
                    label: "Food", // Cleaned: Removed manual hardcoded layout character
                    speakValue: null, 
                    type: "folder",
                    targetBoardId: "sub_food", 
                    colorClass: "tile-folder", 
                    row: 3, col: 1,
                    masked: false
                },
                {
                    id: "tile_folder_toys",
                    label: "Toys", // Cleaned: Removed manual hardcoded layout character
                    speakValue: null,
                    type: "folder",
                    targetBoardId: "sub_toys",
                    colorClass: "tile-folder",
                    row: 3, col: 2,
                    masked: false
                },

                // --- ADVANCED TILES ---
                {
                    id: "tile_you",
                    label: "You",
                    speakValue: "You",
                    type: "action",
                    colorClass: "tile-pronoun",
                    row: 1, col: 2,
                    masked: true 
                },
                {
                    id: "tile_like",
                    label: "Like",
                    speakValue: "I like that",
                    type: "action",
                    colorClass: "tile-verb",
                    row: 2, col: 4,
                    masked: true
                }
            ]
        },

        // The FOOD Sub-board
        "sub_food": {
            id: "sub_food",
            name: "Snacks & Drinks",
            rows: 4,
            cols: 6,
            tiles: [
                {
                    id: "tile_eat",
                    label: "Eat",
                    speakValue: "I want to eat",
                    type: "action",
                    colorClass: "tile-verb",
                    row: 1, col: 1,
                    masked: false
                },
                {
                    id: "tile_apple",
                    label: "Apple",
                    speakValue: "apple",
                    type: "action",
                    colorClass: "tile-noun", 
                    row: 2, col: 1,
                    masked: false
                },
                {
                    id: "tile_water",
                    label: "Water",
                    speakValue: "a drink of water",
                    type: "action",
                    colorClass: "tile-noun", 
                    row: 2, col: 2,
                    masked: false
                }
            ]
        },

        // The Toys sub-board
        "sub_toys": {
            id: "sub_toys",
            name: "Playtime",
            rows: 4,
            cols: 6,
            tiles: [
                {
                    id: "tile_play",
                    label: "Play",
                    speakValue: "Let's play",
                    type: "action",
                    colorClass: "tile-verb",
                    row: 1, col: 1,
                    masked: false
                },
                {
                    id: "tile_blocks",
                    label: "Blocks",
                    speakValue: "building blocks",
                    type: "action",
                    colorClass: "tile-noun",
                    row: 2, col: 1,
                    masked: false
                }
            ]
        }
    }
};