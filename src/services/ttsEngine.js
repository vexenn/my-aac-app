import { KokoroTTS } from "kokoro-js";

class TTSService {
    constructor() {
        this.engine = null;
    }

    // Allocate neural model weights within the browser tab sandbox
    async init() {
        if (this.engine) return;
        this.engine = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
            dtype: "q8",
            device: "wasm"
        });
    }

    get isReady() {
        return this.engine !== null;
    }

    // Process text streams through custom acoustic formatting graphs
    async synthesize(text) {
        if (!this.engine) throw new Error("TTS Engine is uninitialized");

        const audioOutput = await this.engine.generate(text, { voice: "af_jessica" });
        const blob = audioOutput.toBlob();
        const audioUrl = URL.createObjectURL(blob);
        const player = new Audio(audioUrl);

        // Turn off pitch preservation so playback rate shifts voice formants
        player.preservesPitch = false;
        player.playbackRate = 1.08;

        // Initialize Web Audio API hardware processing node chains
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(player);

        // Filter A: Highpass (Removes mature adult chest frequencies below 240Hz)
        const highpass = audioCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 240;

        // Filter B: Peaking (Accentuates bright child-like clear speech presence)
        const peaking = audioCtx.createBiquadFilter();
        peaking.type = "peaking";
        peaking.frequency.value = 3200;
        peaking.Q.value = 1.2;
        peaking.gain.value = 5.0;

        // Chain the hardware links together
        source.connect(highpass);
        highpass.connect(peaking);
        peaking.connect(audioCtx.destination);

        player.play();
    }
}

export const ttsService = new TTSService();