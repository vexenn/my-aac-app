import { store } from './state.js';
import { db, initializeDatabase } from './db/database.js';
import { initializeKeyboardAccessibility } from './input/keyboardHandler.js'; 
import { gamepadHandler } from './input/gamepadHandler.js';

// Grab DOM Elements from our index.html wireframe
const gridBoard = document.getElementById('grid-board');
const sentenceDisplay = document.getElementById('sentence-display');
const btnSpeak = document.getElementById('btn-speak-sentence');
const btnClear = document.getElementById('btn-clear-sentence');
const btnAdminGate = document.getElementById('btn-admin-gate');
const btnHome = document.getElementById('btn-home');

// Grab our Admin Sidebar Drawer Elements
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnDownloadVoice = document.getElementById('btn-download-voice');
const downloadStatus = document.getElementById('download-status');
const chkSpeakOnTap = document.getElementById('chk-speak-on-tap'); 

// Form Node Mapping Hooks
const btnLockLayout = document.getElementById('btn-lock-layout');
const frmTileEditor = document.getElementById('frm-tile-editor');
const btnSaveTile = document.getElementById('btn-save-tile');
const chkGridLines = document.getElementById('chk-grid-lines'); 

// Timeline Target Hooks
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');

// Horizontal Navigation DOM Hook Accessors
const boardPageTabs = document.getElementById('board-page-tabs');
const btnNavPrev = document.getElementById('btn-nav-prev');
const btnNavNext = document.getElementById('btn-nav-next');
const pageNameInput = document.getElementById('page-name-input');
const btnCreatePage = document.getElementById('btn-create-page');
const btnDeletePage = document.getElementById('btn-delete-page');

// Symbol Selector Node Mappings
const tileImageInput = document.getElementById('tile-image-input');
const btnTriggerUpload = document.getElementById('btn-trigger-upload');
const btnRemoveImage = document.getElementById('btn-remove-image');
const tileImageHidden = document.getElementById('tile-image-hidden');
const tileImagePreviewContainer = document.getElementById('tile-image-preview-container');
const tileImagePreview = document.getElementById('tile-image-preview');
const btnDeleteTile = document.getElementById('btn-delete-tile');

// Voice Clip Recording DOM Hook Accessors
const tileAudioHidden = document.getElementById('tile-audio-hidden');
const btnStartRecord = document.getElementById('btn-start-record');
const btnStopRecord = document.getElementById('btn-stop-record');
const btnRemoveAudio = document.getElementById('btn-remove-audio');
const audioPlaybackContainer = document.getElementById('audio-playback-container');
const audioPreview = document.getElementById('audio-preview');

// 🌟 NEW: Fullscreen, Help, and Support DOM Hooks
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
const btnShowHelp = document.getElementById('btn-show-help');
const btnShowSupport = document.getElementById('btn-show-support');
const modalHelp = document.getElementById('modal-help');
const modalSupport = document.getElementById('modal-support');
const btnCloseHelp = document.getElementById('btn-close-help');
const btnCloseSupport = document.getElementById('btn-close-support');

// Native MediaRecorder Runtime Pointers
let mediaRecorder = null;
let audioChunks = [];

// Matrix Grid Rendering Engine
async function renderActiveBoard(state) {
    const activeBoard = await db.boards.get(state.currentBoardId);
    if (!activeBoard) return;

    const isMainRootScreen = activeBoard.isTopLevel || activeBoard.id === 'root_core';
    btnHome.style.display = isMainRootScreen ? 'none' : 'block';

    gridBoard.style.setProperty('--grid-rows', activeBoard.rows);
    gridBoard.style.setProperty('--grid-cols', activeBoard.cols);
    gridBoard.innerHTML = '';

    // COMPLETE MATRIX GENERATOR LOOP
    for (let r = 1; r <= activeBoard.rows; r++) {
        for (let c = 1; c <= activeBoard.cols; c++) {
            const tile = activeBoard.tiles.find(t => t.row === r && t.col === c);

            if (tile) {
                const tileButton = document.createElement('button');
                tileButton.className = `aac-tile ${tile.colorClass}`;
                
                if (tile.image) {
                    const imgNode = document.createElement('img');
                    imgNode.src = tile.image;
                    imgNode.alt = tile.label;
                    tileButton.appendChild(imgNode);
                }

                const labelSpan = document.createElement('span');
                labelSpan.textContent = tile.type === 'folder' ? `${tile.label} ➔` : tile.label;
                tileButton.appendChild(labelSpan);

                tileButton.style.gridRowStart = r;
                tileButton.style.gridColumnStart = c;

                if (tile.masked) {
                    tileButton.classList.add('tile-masked');
                }

                if (state.isAdminMode) {
                    tileButton.setAttribute('draggable', 'true');
                    
                    tileButton.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', tile.id);
                        tileButton.style.opacity = '0.4';
                    });
                    
                    tileButton.addEventListener('dragend', () => {
                        tileButton.style.opacity = '1';
                    });

                    tileButton.addEventListener('dragover', (e) => {
                        if (e.dataTransfer.types.includes('text/plain')) {
                            e.preventDefault();
                            tileButton.classList.add('drag-over-swap');
                        }
                    });

                    tileButton.addEventListener('dragleave', () => {
                        tileButton.classList.remove('drag-over-swap');
                    });

                    tileButton.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        tileButton.classList.remove('drag-over-swap');
                        const draggedTileId = e.dataTransfer.getData('text/plain');
                        if (draggedTileId && draggedTileId !== tile.id) {
                            await store.updateTilePosition(draggedTileId, r, c);
                        }
                    });
                }

                tileButton.addEventListener('click', () => {
                    store.handleTileTap(tile);
                });

                gridBoard.appendChild(tileButton);

            } else {
                if (state.settings.showGridLines || state.isAdminMode) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'grid-cell-placeholder';
                    placeholder.style.gridRowStart = r;
                    placeholder.style.gridColumnStart = c;

                    if (!state.settings.showGridLines) {
                        placeholder.classList.add('placeholder-borderless');
                    }

                    const trackingLabel = document.createElement('span');
                    trackingLabel.className = 'coord-indicator';
                    trackingLabel.textContent = `R${r} C${c}`;
                    placeholder.appendChild(trackingLabel);

                    if (state.isAdminMode) {
                        placeholder.style.cursor = 'pointer';
                        
                        placeholder.addEventListener('click', () => {
                            store.setPlaceholderFocus();
                            
                            frmTileEditor.reset();
                            document.getElementById('edit-tile-id').value = '';
                            document.getElementById('tile-label').value = '';
                            document.getElementById('tile-speak').value = '';
                            document.getElementById('tile-row').value = r;
                            document.getElementById('tile-col').value = c;
                            document.getElementById('tile-color-class').value = 'tile-noun';
                            document.getElementById('tile-masked').checked = false;
                            
                            tileImageHidden.value = '';
                            tileImagePreviewContainer.style.display = 'none';
                            tileImagePreview.src = '';
                            btnRemoveImage.style.display = 'none';

                            tileAudioHidden.value = '';
                            audioPreview.src = '';
                            audioPlaybackContainer.style.display = 'none';
                            btnRemoveAudio.style.display = 'none';

                            btnSaveTile.textContent = "💾 Save Communication Tile";
                        });

                        placeholder.addEventListener('dragover', (e) => {
                            e.preventDefault(); 
                            placeholder.classList.add('drag-over');
                        });

                        placeholder.addEventListener('dragleave', () => {
                            placeholder.classList.remove('drag-over');
                        });

                        placeholder.addEventListener('drop', async (e) => {
                            e.preventDefault();
                            placeholder.classList.remove('drag-over');
                            const tileId = e.dataTransfer.getData('text/plain');
                            if (tileId) {
                                await store.updateTilePosition(tileId, r, c);
                            }
                        });
                    }

                    gridBoard.appendChild(placeholder);
                }
            }
        }
    }
}

// Visual Page Tabs Selector chip Engine
function renderPageTabs(state) {
    boardPageTabs.innerHTML = '';
    state.topLevelPages.forEach((page) => {
        const tabButton = document.createElement('button');
        tabButton.className = 'page-tab-chip';
        tabButton.textContent = page.name;

        if (state.currentBoardId === page.id) {
            tabButton.classList.add('chip-active');
        }

        tabButton.addEventListener('click', () => {
            store.switchActiveBoard(page.id);
        });

        boardPageTabs.appendChild(tabButton);
    });
}

// The Dynamic Sentence Bar Rendering Engine
function renderSentenceBar(state) {
    sentenceDisplay.innerHTML = '';
    state.sentenceQueue.forEach(tile => {
        const wordChip = document.createElement('span');
        wordChip.className = `aac-tile ${tile.colorClass}`;
        wordChip.style.padding = '5px 12px';
        wordChip.style.fontSize = '1.1rem';
        wordChip.style.height = '80%';
        wordChip.textContent = tile.label;
        sentenceDisplay.appendChild(wordChip);
    });
}

// Fixed Static Event Listeners
btnSpeak.addEventListener('click', () => store.speakSentence());
btnClear.addEventListener('click', () => store.clearSentence());
btnHome.addEventListener('click', () => store.goHome());
chkSpeakOnTap.addEventListener('change', () => store.toggleSpeakOnTap()); 
chkGridLines.addEventListener('change', () => store.toggleGridLines()); 

// Timeline Action Hook Connectors
btnUndo.addEventListener('click', () => store.undo());
btnRedo.addEventListener('click', () => store.redo());

// Kinetic Navigation Arrow Scrolling Links
btnNavPrev.addEventListener('click', () => { boardPageTabs.scrollLeft -= 140; });
btnNavNext.addEventListener('click', () => { boardPageTabs.scrollLeft += 140; });

btnCreatePage.addEventListener('click', async () => {
    const pageName = pageNameInput.value;
    if (!pageName.trim()) {
        alert("Please enter a valid page name label.");
        return;
    }
    await store.createStandalonePage(pageName);
    pageNameInput.value = ''; 
});

btnDeletePage.addEventListener('click', async () => {
    await store.deleteActivePage();
});

// Symbol Upload Canvas Resizing Handlers
btnTriggerUpload.addEventListener('click', () => tileImageInput.click());

tileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 250;
            const MAX_HEIGHT = 250;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            
            tileImageHidden.value = compressedBase64;
            tileImagePreview.src = compressedBase64;
            tileImagePreviewContainer.style.display = 'flex';
            btnRemoveImage.style.display = 'block';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

btnRemoveImage.addEventListener('click', () => {
    tileImageHidden.value = '';
    tileImagePreview.src = '';
    tileImagePreviewContainer.style.display = 'none';
    btnRemoveImage.style.display = 'none';
    tileImageInput.value = '';
});

// Hardware Microphone Recording Stream Listeners
btnStartRecord.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio microphone capture pipelines are restricted or unsupported on this tablet client browser device.");
        return;
    }

    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(audioStream);

        mediaRecorder.addEventListener("dataavailable", (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        });

        mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            
            reader.onloadend = () => {
                const base64Audio = reader.result;
                tileAudioHidden.value = base64Audio;
                audioPreview.src = base64Audio;
                audioPlaybackContainer.style.display = 'flex';
                btnRemoveAudio.style.display = 'block';
            };
            reader.readAsDataURL(audioBlob);

            audioStream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        btnStartRecord.style.display = 'none';
        btnStopRecord.style.display = 'block';
        btnRemoveAudio.style.display = 'none';
    } catch (err) {
        console.error("Failed to secure voice capture channels:", err);
        alert("Microphone hardware connection denied. Please verify application system layout safety settings.");
    }
});

btnStopRecord.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        btnStartRecord.style.display = 'block';
        btnStopRecord.style.display = 'none';
    }
});

btnRemoveAudio.addEventListener('click', () => {
    tileAudioHidden.value = '';
    audioPreview.src = '';
    audioPlaybackContainer.style.display = 'none';
    btnRemoveAudio.style.display = 'none';
});

// 🌟 NEW: Fullscreen Protection API Toggle
if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                btnToggleFullscreen.textContent = "📺 Exit Fullscreen Mode";
                btnToggleFullscreen.style.backgroundColor = "#E91E63";
            }).catch(err => {
                alert(`Could not enter fullscreen: ${err.message}. (Note: iOS Safari requires installing to Home Screen for fullscreen).`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    btnToggleFullscreen.textContent = "📺 Enter Fullscreen Mode";
                    btnToggleFullscreen.style.backgroundColor = "#2196F3";
                });
            }
        }
    });

    // Listen for OS-level fullscreen changes (e.g. user pressing Escape)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            btnToggleFullscreen.textContent = "📺 Enter Fullscreen Mode";
            btnToggleFullscreen.style.backgroundColor = "#2196F3";
        } else {
            btnToggleFullscreen.textContent = "📺 Exit Fullscreen Mode";
            btnToggleFullscreen.style.backgroundColor = "#E91E63";
        }
    });
}

// 🌟 NEW: Modal Open & Close Event Listeners
if (btnShowHelp && modalHelp) {
    btnShowHelp.addEventListener('click', () => modalHelp.showModal());
    btnCloseHelp.addEventListener('click', () => modalHelp.close());
    modalHelp.addEventListener('click', (e) => {
        if (e.target === modalHelp) modalHelp.close(); // Close when clicking backdrop
    });
}

if (btnShowSupport && modalSupport) {
    btnShowSupport.addEventListener('click', () => modalSupport.showModal());
    btnCloseSupport.addEventListener('click', () => modalSupport.close());
    modalSupport.addEventListener('click', (e) => {
        if (e.target === modalSupport) modalSupport.close(); // Close when clicking backdrop
    });
}

// Global Sidebar Menu Deletion Action Handler
if (btnDeleteTile) {
    btnDeleteTile.addEventListener('click', async () => {
        const activeTileId = document.getElementById('edit-tile-id').value;
        if (!activeTileId) return;

        const confirmClear = confirm("Are you completely sure you want to permanently delete this communication tile?");
        if (!confirmClear) return;

        await store.deleteCustomTile(activeTileId);

        frmTileEditor.reset();
        document.getElementById('edit-tile-id').value = '';
        tileImageHidden.value = '';
        tileImagePreviewContainer.style.display = 'none';
        tileImagePreview.src = '';
        btnRemoveImage.style.display = 'none';
        btnDeleteTile.style.display = 'none'; 
        
        tileAudioHidden.value = '';
        audioPreview.src = '';
        audioPlaybackContainer.style.display = 'none';
        btnRemoveAudio.style.display = 'none';

        btnSaveTile.textContent = "💾 Save Communication Tile";
    });
}

if (frmTileEditor) {
    frmTileEditor.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tileData = {
            id: document.getElementById('edit-tile-id').value || null,
            label: document.getElementById('tile-label').value,
            speakValue: document.getElementById('tile-speak').value,
            colorClass: document.getElementById('tile-color-class').value,
            row: document.getElementById('tile-row').value,
            col: document.getElementById('tile-col').value,
            masked: document.getElementById('tile-masked').checked,
            image: tileImageHidden.value || null,
            audio: tileAudioHidden.value || null 
        };
        
        await store.saveCustomTile(tileData);
        
        frmTileEditor.reset();
        document.getElementById('edit-tile-id').value = '';
        tileImageHidden.value = '';
        tileImagePreviewContainer.style.display = 'none';
        tileImagePreview.src = '';
        btnRemoveImage.style.display = 'none';
        
        tileAudioHidden.value = '';
        audioPreview.src = '';
        audioPlaybackContainer.style.display = 'none';
        btnRemoveAudio.style.display = 'none';

        btnSaveTile.textContent = "💾 Save Communication Tile";
    });
}

// Secure 5-Second Hold Action Gate
let adminTimer;
btnAdminGate.addEventListener('pointerdown', () => {
    if (store.state.isAdminMode) {
        store.openSidebar();
        return;
    }
    adminTimer = setTimeout(() => {
        store.enterAdminMode();
        alert("Admin Workspace Unlocked. Control sidebar drawer opened.");
    }, 5000); 
});

btnAdminGate.addEventListener('pointerup', () => clearTimeout(adminTimer));
btnAdminGate.addEventListener('pointerleave', () => clearTimeout(adminTimer));

if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener('click', () => store.closeSidebar());
}
if (btnLockLayout) {
    btnLockLayout.addEventListener('click', () => store.exitAdminMode());
}

btnDownloadVoice.addEventListener('click', async () => {
    downloadStatus.textContent = "📥 Connecting to HuggingFace. Downloading matrix...";
    downloadStatus.style.color = "#0288D1";
    btnDownloadVoice.disabled = true;
    btnDownloadVoice.style.opacity = "0.6";

    await store.initLocalAIEngine();
    localStorage.setItem('aac_voice_installed', 'true');

    downloadStatus.textContent = "🎉 Premium Child Voice Successfully Installed Offline!";
    downloadStatus.style.color = "#388E3C";
    btnDownloadVoice.style.display = "none"; 
});

// App Core Bootstrap Sequence Loop
async function bootstrapApp() {
    await initializeDatabase();

    initializeKeyboardAccessibility();
    gamepadHandler.listen();

    if (localStorage.getItem('aac_voice_installed') === 'true') {
        console.log("Persistent voice token discovered. Auto-warming local AI engine from browser cache...");
        store.initLocalAIEngine();
    }

    store.subscribe((latestState) => {
        renderActiveBoard(latestState);
        renderPageTabs(latestState); 
        renderSentenceBar(latestState);
        
        document.body.classList.toggle('admin-active', latestState.isAdminMode);
        document.body.classList.toggle('sidebar-open', latestState.isSidebarOpen);

        chkSpeakOnTap.checked = latestState.settings.speakOnTap; 
        chkGridLines.checked = latestState.settings.showGridLines; 

        btnUndo.disabled = !latestState.canUndo;
        btnRedo.disabled = !latestState.canRedo;

        if (latestState.selectedTileForEdit) {
            const tile = latestState.selectedTileForEdit;
            document.getElementById('edit-tile-id').value = tile.id || '';
            document.getElementById('tile-label').value = tile.label || '';
            document.getElementById('tile-speak').value = tile.speakValue || '';
            document.getElementById('tile-row').value = tile.row || '';
            document.getElementById('tile-col').value = tile.col || '';
            document.getElementById('tile-color-class').value = tile.colorClass || 'tile-noun';
            document.getElementById('tile-masked').checked = tile.masked === true;
            
            if (btnDeleteTile) btnDeleteTile.style.display = 'block';

            if (tile.image) {
                tileImageHidden.value = tile.image;
                tileImagePreview.src = tile.image;
                tileImagePreviewContainer.style.display = 'flex';
                btnRemoveImage.style.display = 'block';
            } else {
                tileImageHidden.value = '';
                tileImagePreview.src = '';
                tileImagePreviewContainer.style.display = 'none';
                btnRemoveImage.style.display = 'none';
            }

            if (tile.audio) {
                tileAudioHidden.value = tile.audio;
                audioPreview.src = tile.audio;
                audioPlaybackContainer.style.display = 'flex';
                btnRemoveAudio.style.display = 'block';
            } else {
                tileAudioHidden.value = '';
                audioPreview.src = '';
                audioPlaybackContainer.style.display = 'none';
                btnRemoveAudio.style.display = 'none';
            }

            btnSaveTile.textContent = "📝 Update Tile Details";
        } else {
            if (btnDeleteTile) btnDeleteTile.style.display = 'none';
        }

        if (latestState.isVoiceLoading) {
            btnSpeak.textContent = "⏳ Warming Voice...";
            btnSpeak.style.backgroundColor = "#FFA726"; 
            btnSpeak.style.opacity = "0.8";
        } else if (latestState.isVoiceReady) {
            btnSpeak.textContent = "🔊 Speak";
            btnSpeak.style.backgroundColor = "#4CAF50"; 
            btnSpeak.style.opacity = "1";
            
            if (downloadStatus && btnDownloadVoice) {
                downloadStatus.textContent = "🎉 Premium Child Voice Successfully Installed Offline!";
                downloadStatus.style.color = "#388E3C";
                btnDownloadVoice.style.display = "none";
            }
        } else {
            btnSpeak.textContent = "🔊 Speak";
            btnSpeak.style.backgroundColor = ""; 
            btnSpeak.style.opacity = "";
        }
    });

    store.emit();
}

bootstrapApp();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service worker registered successfully!', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}