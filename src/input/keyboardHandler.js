import { switchScanner } from "./switchScanner.js";
import { store } from "../state.js";

export function initializeKeyboardAccessibility() {
    window.addEventListener("keydown", (event) => {
        // Guard access loops: ignore key captures while parents type label strings
        if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") {
            return;
        }

        switch (event.key) {
            case " ": // Spacebar key functions as primary target selector switch
                event.preventDefault();
                if (!switchScanner.isScanning) {
                    switchScanner.start();
                } else {
                    switchScanner.triggerSelection();
                }
                break;
                
            case "Escape": // Escape switches off active row visual scanning paths
                event.preventDefault();
                switchScanner.stop();
                break;
                
            case "s": // "S" key functions as immediate voice speak toggle shortcuts
                if (!store.state.isAdminMode) {
                    event.preventDefault();
                    store.speakSentence();
                }
                break;
        }
    });
}