import { store } from "../state.js";

class SwitchScanningEngine {
    constructor() {
        this.currentIndex = 0;
        this.intervalId = null;
        this.activeElements = [];
        this.isScanning = false;
        this.scanSpeedMs = 1200; // Time interval highlighted over each coordinate slot
    }

    start() {
        if (this.isScanning || store.state.isAdminMode) return;
        this.isScanning = true;
        this.currentIndex = 0;
        
        // Harvest all visible, unmasked communication layout nodes present on the active board
        this.refreshElements();
        
        if (this.activeElements.length === 0) return;
        this.tick();
        this.intervalId = setInterval(() => this.tick(), this.scanSpeedMs);
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isScanning = false;
        this.clearActiveHighlights();
    }

    refreshElements() {
        this.clearActiveHighlights();
        this.activeElements = Array.from(document.querySelectorAll("#grid-board button.aac-tile:not(.tile-masked)"));
    }

    tick() {
        this.clearActiveHighlights();
        if (this.activeElements.length === 0) return;

        if (this.currentIndex >= this.activeElements.length) {
            this.currentIndex = 0;
        }

        const currentTarget = this.activeElements[this.currentIndex];
        if (currentTarget) {
            currentTarget.classList.add("scan-highlight-active");
            currentTarget.focus();
        }
        this.currentIndex++;
    }

    // Trigger selection when physical assistive switch equipment closes the loop
    triggerSelection() {
        if (!this.isScanning || this.activeElements.length === 0) return;
        
        const selectedIndex = (this.currentIndex === 0) ? this.activeElements.length - 1 : this.currentIndex - 1;
        const selectedElement = this.activeElements[selectedIndex];
        
        if (selectedElement) {
            selectedElement.click(); // Execute tile click behavior programmatically
            this.refreshElements();   // Refresh focus layout positions
        }
    }

    clearActiveHighlights() {
        this.activeElements.forEach(el => el.classList.remove("scan-highlight-active"));
    }
}

export const switchScanner = new SwitchScanningEngine();