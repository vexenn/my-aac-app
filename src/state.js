import { KokoroTTS } from "kokoro-js"; // Import client-side browser engine
import { db } from "./db/database.js";  // Static import for direct transactional access

class StateManager {
    constructor() {
        this.state = {
            settings: {
                voicePitch: 1.0,
                voiceRate: 0.85, 
                maxRows: 6,
                maxCols: 8,
                speakOnTap: true, 
                showGridLines: true 
            },
            currentBoardId: "root_core",
            sentenceQueue: [], 
            isAdminMode: false,
            isSidebarOpen: false,       
            selectedTileForEdit: null,  
            maskedTileIds: new Set(), 
            isVoiceLoading: false,    
            isVoiceReady: false,
            canUndo: false,
            canRedo: false,
            topLevelPages: [] 
        };

        this.listeners = [];
        this.ttsEngine = null; 

        this.undoStack = [];
        this.redoStack = [];
    }

    async initLocalAIEngine() {
        if (this.ttsEngine) return; 
        try {
            this.state.isVoiceLoading = true;
            this.emit();
            this.ttsEngine = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
                dtype: "q8",
                device: "wasm" 
            });
            this.state.isVoiceLoading = false;
            this.state.isVoiceReady = true;
            this.emit();
            console.log("Local AI Speech Engine is fully cached offline!");
        } catch (error) {
            this.state.isVoiceLoading = false;
            this.state.isVoiceReady = false;
            this.emit();
            console.error("Failed to compile local AI speech processor:", error);
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    async emit() {
        this.state.canUndo = this.undoStack.length > 0;
        this.state.canRedo = this.redoStack.length > 0;
        
        const allBoards = await db.boards.toArray();
        this.state.topLevelPages = allBoards.filter(b => b.isTopLevel || b.id === 'root_core');
        
        this.listeners.forEach(listener => listener(this.state));
    }

    async captureHistorySnapshot() {
        const allBoards = await db.boards.toArray();
        this.undoStack.push(JSON.parse(JSON.stringify(allBoards)));
        
        if (this.undoStack.length > 10) {
            this.undoStack.shift();
        }
        this.redoStack = []; 
    }

    async undo() {
        if (this.undoStack.length === 0) return;
        const allBoards = await db.boards.toArray();
        this.redoStack.push(JSON.parse(JSON.stringify(allBoards)));
        
        const previousDatabaseSnapshot = this.undoStack.pop();
        
        await db.boards.clear();
        await db.boards.bulkPut(previousDatabaseSnapshot);
        
        const boardCheck = await db.boards.get(this.state.currentBoardId);
        if (!boardCheck) {
            this.state.currentBoardId = "root_core";
        }
        
        await this.emit();
    }

    async redo() {
        if (this.redoStack.length === 0) return;
        const allBoards = await db.boards.toArray();
        this.undoStack.push(JSON.parse(JSON.stringify(allBoards)));

        const nextDatabaseSnapshot = this.redoStack.pop();

        await db.boards.clear();
        await db.boards.bulkPut(nextDatabaseSnapshot);

        const boardCheck = await db.boards.get(this.state.currentBoardId);
        if (!boardCheck) {
            this.state.currentBoardId = "root_core";
        }

        await this.emit();
    }

    async createStandalonePage(pageName) {
        if (!pageName.trim()) return;
        await this.captureHistorySnapshot();

        const newBoardId = `page_${Date.now()}`;
        const newBoardPayload = {
            id: newBoardId,
            name: pageName.trim(),
            rows: 4,
            cols: 6,
            tiles: [],
            isTopLevel: true 
        };

        await db.boards.put(newBoardPayload);
        this.state.currentBoardId = newBoardId; 
        await this.emit();
    }

    async deleteActivePage() {
        if (this.state.currentBoardId === 'root_core') {
            alert("The primary core vocabulary layout page functions as the engine base and cannot be deleted.");
            return;
        }

        const confirmDelete = confirm("Are you completely sure you want to delete this standalone layout page and all its custom words?");
        if (!confirmDelete) return;

        await this.captureHistorySnapshot();
        await db.boards.delete(this.state.currentBoardId);
        
        this.state.currentBoardId = "root_core"; 
        await this.emit();
    }

    switchActiveBoard(boardId) {
        this.state.currentBoardId = boardId;
        this.state.selectedTileForEdit = null;
        this.emit();
    }

    toggleGridLines() {
        this.state.settings.showGridLines = !this.state.settings.showGridLines;
        this.emit();
    }

    enterAdminMode() {
        this.state.isAdminMode = true;
        this.state.isSidebarOpen = true;
        this.state.selectedTileForEdit = null;
        this.emit();
    }

    closeSidebar() {
        this.state.isSidebarOpen = false;
        this.emit();
    }

    openSidebar() {
        this.state.isSidebarOpen = true;
        this.emit();
    }

    setPlaceholderFocus() {
        this.state.selectedTileForEdit = null;
        this.state.isSidebarOpen = true;
        this.emit();
    }

    exitAdminMode() {
        this.state.isAdminMode = false;
        this.state.isSidebarOpen = false;
        this.state.selectedTileForEdit = null;
        this.emit();
    }

    async updateTilePosition(tileId, targetRow, targetCol) {
        await this.captureHistorySnapshot();

        const activeBoard = await db.boards.get(this.state.currentBoardId);
        if (!activeBoard) return;

        const movingTile = activeBoard.tiles.find(t => t.id === tileId);
        if (!movingTile) return;

        const oldRow = movingTile.row;
        const oldCol = movingTile.col;

        const occupyingTile = activeBoard.tiles.find(t => t.row === targetRow && t.col === targetCol);

        if (occupyingTile) {
            occupyingTile.row = oldRow;
            occupyingTile.col = oldCol;
        }

        movingTile.row = targetRow;
        movingTile.col = targetCol;

        await db.boards.put(activeBoard);
        
        if (this.state.selectedTileForEdit && this.state.selectedTileForEdit.id === tileId) {
            this.state.selectedTileForEdit = movingTile;
        }
        
        await this.emit(); 
    }

    async deleteCustomTile(tileId) {
        if (!tileId) return;
        await this.captureHistorySnapshot();

        const activeBoard = await db.boards.get(this.state.currentBoardId);
        if (!activeBoard) return;

        activeBoard.tiles = activeBoard.tiles.filter(t => t.id !== tileId);
        await db.boards.put(activeBoard);

        this.state.selectedTileForEdit = null;
        await this.emit();
    }

    async saveCustomTile(tileData) {
        await this.captureHistorySnapshot();

        const activeBoard = await db.boards.get(this.state.currentBoardId);
        if (!activeBoard) return;

        const rowNum = parseInt(tileData.row, 10);
        const colNum = parseInt(tileData.col, 10);
        const isEdit = !!tileData.id;
        const finalId = tileData.id || `tile_${Date.now()}`;
        const isFolder = tileData.colorClass === 'tile-folder';

        const existingTile = isEdit ? activeBoard.tiles.find(t => t.id === tileData.id) : null;
        const cleanedLabel = tileData.label.replace(/➔/g, '').replace(/-/g, '').trim();

        const preparedTile = {
            id: finalId,
            label: cleanedLabel,
            speakValue: tileData.speakValue || null,
            type: isFolder ? 'folder' : 'action',
            colorClass: tileData.colorClass,
            row: rowNum,
            col: colNum,
            masked: tileData.masked === true,
            image: tileData.image || null,
            audio: tileData.audio || null // 🌟 Saves the custom recording data string safely inside the board row
        };

        if (isFolder) {
            preparedTile.targetBoardId = (existingTile && existingTile.targetBoardId) 
                ? existingTile.targetBoardId 
                : `board_${Date.now()}`;
            
            const subBoardCheck = await db.boards.get(preparedTile.targetBoardId);
            if (!subBoardCheck) {
                await db.boards.put({
                    id: preparedTile.targetBoardId,
                    name: `${cleanedLabel} Category`,
                    rows: 4,
                    cols: 6,
                    tiles: []
                });
            }
        }

        activeBoard.tiles = activeBoard.tiles.filter(t => 
            t.id !== preparedTile.id && !(t.row === preparedTile.row && t.col === preparedTile.col)
        );

        activeBoard.tiles.push(preparedTile);
        await db.boards.put(activeBoard);

        this.state.selectedTileForEdit = null;
        await this.emit(); 
    }

    handleTileTap(tile) {
        if (this.state.isAdminMode) {
            this.state.isSidebarOpen = true;
            this.state.selectedTileForEdit = tile;
            this.emit();
            return;
        }

        if (tile.type === "folder") {
            this.state.currentBoardId = tile.targetBoardId;
            this.emit();
        } else if (tile.type === "action") {
            this.state.sentenceQueue.push(tile);
            this.emit();

            if (this.state.settings.speakOnTap) {
                // 🌟 CUSTOM AUDIO ENGINE CHECK: Prioritize recorded voice clips over TTS output
                if (tile.audio) {
                    const localClip = new Audio(tile.audio);
                    localClip.play().catch(() => this.speak(tile.speakValue || tile.label));
                } else if (tile.audioSrc) {
                    new Audio(tile.audioSrc).play().catch(() => this.speak(tile.speakValue || tile.label));
                } else {
                    this.speak(tile.speakValue || tile.label);
                }
            }
        }
    }

    toggleSpeakOnTap() {
        this.state.settings.speakOnTap = !this.state.settings.speakOnTap;
        this.emit();
    }

    speakSentence() {
        if (this.state.sentenceQueue.length === 0) return;
        const fullPhrase = this.state.sentenceQueue.map(tile => tile.speakValue || tile.label).join(" ");
        this.speak(fullPhrase);
    }

    clearSentence() {
        this.state.sentenceQueue = [];
        this.emit();
    }

    goHome() {
        this.state.currentBoardId = "root_core";
        this.state.selectedTileForEdit = null; 
        this.emit();
    }

    async speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (this.ttsEngine) {
            try {
                const audioOutput = await this.ttsEngine.generate(text, { voice: "af_jessica" });
                const blob = audioOutput.toBlob(); 
                const audioUrl = URL.createObjectURL(blob);
                const player = new Audio(audioUrl);
                
                player.preservesPitch = false;
                player.playbackRate = 1.08; 

                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaElementSource(player);

                const highpassFilter = audioCtx.createBiquadFilter();
                highpassFilter.type = "highpass";
                highpassFilter.frequency.value = 240; 

                const peakingFilter = audioCtx.createBiquadFilter();
                peakingFilter.type = "peaking";
                peakingFilter.frequency.value = 3200; 
                peakingFilter.Q.value = 1.2;          
                peakingFilter.gain.value = 5.0;       

                source.connect(highpassFilter);
                highpassFilter.connect(peakingFilter);
                peakingFilter.connect(audioCtx.destination);
                
                player.play();
                return; 
            } catch (err) {
                console.warn("Dynamic local AI synthesis stubbed, falling back to Web Speech API:", err);
            }
        }

        if (!('speechSynthesis' in window)) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = this.state.settings.voicePitch;
        utterance.rate = this.state.settings.voiceRate;
        window.speechSynthesis.speak(utterance);
    }
}

export const store = new StateManager();