import { switchScanner } from "./switchScanner.js";

class ControllerInputModule {
    constructor() {
        this.connectedGamepads = new Map();
        this.buttonStates = new Map();
    }

    listen() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log(`Hardware controller mapped successfully: ${e.gamepad.id}`);
            this.pollTimeline();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            this.connectedGamepads.delete(e.gamepad.index);
        });
    }

    pollTimeline() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let activelyAttached = false;

        for (const gp of gamepads) {
            if (!gp) continue;
            activelyAttached = true;
            
            // Check cross-platform controller button mapping footprints (Button 0 is A / Cross)
            const primaryButtonPressed = gp.buttons[0].pressed;
            const previousState = this.buttonStates.get(gp.index) || false;

            if (primaryButtonPressed && !previousState) {
                // Controller closed loop input caught: route straight to selection layers
                if (!switchScanner.isScanning) {
                    switchScanner.start();
                } else {
                    switchScanner.triggerSelection();
                }
            }
            this.buttonStates.set(gp.index, primaryButtonPressed);
        }

        if (activelyAttached) {
            requestAnimationFrame(() => this.pollTimeline());
        }
    }
}

export const gamepadHandler = new ControllerInputModule();