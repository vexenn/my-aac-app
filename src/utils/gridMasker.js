import { db } from "../db/database.js";

export const GridMasker = {
    /**
     * Batch mask or unmask all communication tiles matching a structural target profile type
     */
    async toggleMaskByCategory(boardId, targetColorClass, shouldMask) {
        const board = await db.boards.get(boardId);
        if (!board) return;

        board.tiles = board.tiles.map((tile) => {
            if (tile.colorClass === targetColorClass) {
                return { ...tile, masked: shouldMask };
            }
            return tile;
        });

        await db.boards.put(board);
    },

    /**
     * Wipes clean all visibility configurations on a board to restore maximum accessibility grid bounds
     */
    async clearAllMasks(boardId) {
        const board = await db.boards.get(boardId);
        if (!board) return;

        board.tiles = board.tiles.map(tile => ({ ...tile, masked: false }));
        await db.boards.put(board);
    }
};