/**
 * Converted utility mapping Open Board Format (OBF) standard keys
 * directly into our internal Dexie IndexedDB storage layout models.
 */
export function convertOBFToInternalSchema(obfJson) {
    if (!obfJson || !obfJson.id) {
        throw new Error("Invalid Open Board Format specification payload.");
    }

    const totalRows = obfJson.grid?.rows || 4;
    const totalCols = obfJson.grid?.columns || 6;

    const transformedTiles = obfJson.buttons.map((btn) => {
        // Map the OBF semantic classification codes down to our Fitzgerald CSS standard
        let internalColor = "tile-noun";
        if (btn.load_board) internalColor = "tile-folder";
        else if (btn.category === "pronoun") internalColor = "tile-pronoun";
        else if (btn.category === "action" || btn.category === "verb") internalColor = "tile-verb";
        else if (btn.category === "social") internalColor = "tile-social";
        else if (btn.category === "modifier") internalColor = "tile-modifier";

        return {
            id: btn.id || `tile_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            label: btn.label || "",
            speakValue: btn.vocalization || btn.label || "",
            type: btn.load_board ? "folder" : "action",
            colorClass: internalColor,
            row: btn.ext_aac_row || 1, 
            col: btn.ext_aac_col || 1,
            targetBoardId: btn.load_board?.id || null,
            masked: btn.hidden === true
        };
    });

    return {
        id: obfJson.id,
        name: obfJson.name || "Imported Catalog Layout",
        rows: totalRows,
        cols: totalCols,
        tiles: transformedTiles
    };
}