/**
 * The sound palette — layer/recipe types plus the fourteen built-in recipes.
 * Each sound has its own distinct shape — a chime, an arpeggio, a pitch
 * glide, a warm pad, a breath — rather than being a volume/EQ tweak on
 * the same click. Add a new one here without touching any audio graph code.
 */
type BaseLayer = {
    /** Seconds after the trigger that this layer starts. */
    offset?: number;
    /** Fade-in time, in seconds. */
    attack: number;
    /** Fade-out time, in seconds, starting right after the attack. */
    decay: number;
    /** Peak volume reached at the end of the attack. */
    peak: number;
};
/** A single note — the building block for chimes, arpeggios, and pads. */
export type ToneLayer = BaseLayer & {
    kind: "tone";
    waveform: OscillatorType;
    frequency: number;
    /** Detune in cents, for a gentle chorus/beating effect between layers. */
    detune?: number;
    /** If set, the pitch glides smoothly from `frequency` to this value. */
    glideTo?: number;
    /** How long the glide takes, in seconds. Defaults to attack + decay. */
    glideTime?: number;
};
/** A soft filtered noise bed — used for breathy, textural layers. */
export type NoiseLayer = BaseLayer & {
    kind: "noise";
    filterType: BiquadFilterType;
    filterFrequency: number;
    filterQ?: number;
};
export type SoundLayer = ToneLayer | NoiseLayer;
/** A soft, spacious echo tail applied to the whole sound — the "magic dust". */
export type Shimmer = {
    delay: number;
    feedback: number;
    wet: number;
    lowpass: number;
};
export type SoundRecipe = {
    masterGain: number;
    layers: SoundLayer[];
    shimmer?: Shimmer;
};
export declare const RECIPES: {
    /** A soft two-note ascending bell, like an iOS/macOS confirmation tink. */
    readonly chime: {
        readonly masterGain: 0.5;
        readonly layers: [{
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1046.5;
            readonly attack: 0.006;
            readonly decay: 0.22;
            readonly peak: 0.09;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1568;
            readonly offset: 0.09;
            readonly attack: 0.006;
            readonly decay: 0.26;
            readonly peak: 0.08;
        }];
        readonly shimmer: {
            readonly delay: 0.12;
            readonly feedback: 0.25;
            readonly wet: 0.18;
            readonly lowpass: 4000;
        };
    };
    /** A quick ascending twinkle of four notes — bright and playful. */
    readonly sparkle: {
        readonly masterGain: 0.5;
        readonly layers: [{
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1760;
            readonly offset: 0;
            readonly attack: 0.003;
            readonly decay: 0.09;
            readonly peak: 0.045;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 2217;
            readonly offset: 0.045;
            readonly attack: 0.003;
            readonly decay: 0.09;
            readonly peak: 0.04;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 2637;
            readonly offset: 0.09;
            readonly attack: 0.003;
            readonly decay: 0.1;
            readonly peak: 0.038;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 3520;
            readonly offset: 0.135;
            readonly attack: 0.003;
            readonly decay: 0.12;
            readonly peak: 0.032;
        }];
        readonly shimmer: {
            readonly delay: 0.07;
            readonly feedback: 0.35;
            readonly wet: 0.22;
            readonly lowpass: 6000;
        };
    };
    /** A single note gliding smoothly downward, like a drop of water. */
    readonly droplet: {
        readonly masterGain: 0.55;
        readonly layers: [{
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1200;
            readonly glideTo: 550;
            readonly glideTime: 0.14;
            readonly attack: 0.004;
            readonly decay: 0.2;
            readonly peak: 0.075;
        }];
        readonly shimmer: {
            readonly delay: 0.09;
            readonly feedback: 0.2;
            readonly wet: 0.15;
            readonly lowpass: 3000;
        };
    };
    /** A warm, slow-swelling pad from two gently detuned sines. */
    readonly bloom: {
        readonly masterGain: 0.5;
        readonly layers: [{
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 528;
            readonly attack: 0.06;
            readonly decay: 0.32;
            readonly peak: 0.06;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 528;
            readonly detune: 12;
            readonly attack: 0.06;
            readonly decay: 0.34;
            readonly peak: 0.05;
        }];
        readonly shimmer: {
            readonly delay: 0.15;
            readonly feedback: 0.2;
            readonly wet: 0.12;
            readonly lowpass: 2500;
        };
    };
    /** The quietest option — a breathy, textureless swell for dense lists. */
    readonly whisper: {
        readonly masterGain: 0.5;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "lowpass";
            readonly filterFrequency: 1200;
            readonly filterQ: 0.7;
            readonly attack: 0.04;
            readonly decay: 0.16;
            readonly peak: 0.05;
        }];
    };
    /** A focused, bandpass-filtered tick with a bright sine ping on top — crisp and instant. */
    readonly tick: {
        readonly masterGain: 0.4;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 5400;
            readonly filterQ: 1.8;
            readonly attack: 0.001;
            readonly decay: 0.018;
            readonly peak: 0.14;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 2600;
            readonly attack: 0.001;
            readonly decay: 0.012;
            readonly peak: 0.018;
        }];
    };
    /** A dull, muted knock — the "down" half of a press/release pair, like a key bottoming out. */
    readonly press: {
        readonly masterGain: 0.4;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 1700;
            readonly filterQ: 1.4;
            readonly attack: 0.001;
            readonly decay: 0.02;
            readonly peak: 0.13;
        }];
    };
    /** A brighter, springier tick — the "up" half of a press/release pair, like a key returning. */
    readonly release: {
        readonly masterGain: 0.4;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 4600;
            readonly filterQ: 1.8;
            readonly attack: 0.001;
            readonly decay: 0.016;
            readonly peak: 0.12;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 3200;
            readonly offset: 0.006;
            readonly attack: 0.001;
            readonly decay: 0.05;
            readonly peak: 0.02;
        }];
    };
    /** A two-part click-clack, like a mechanical switch flipping between states. */
    readonly toggle: {
        readonly masterGain: 0.4;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 2200;
            readonly filterQ: 1.6;
            readonly attack: 0.001;
            readonly decay: 0.016;
            readonly peak: 0.12;
        }, {
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 3800;
            readonly filterQ: 1.6;
            readonly offset: 0.024;
            readonly attack: 0.001;
            readonly decay: 0.02;
            readonly peak: 0.1;
        }];
    };
    /** A short, warm three-note ascending confirmation — "done", not a fanfare. */
    readonly success: {
        readonly masterGain: 0.5;
        readonly layers: [{
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 880;
            readonly attack: 0.004;
            readonly decay: 0.09;
            readonly peak: 0.06;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1108.73;
            readonly offset: 0.06;
            readonly attack: 0.004;
            readonly decay: 0.1;
            readonly peak: 0.06;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 1318.51;
            readonly offset: 0.12;
            readonly attack: 0.004;
            readonly decay: 0.18;
            readonly peak: 0.07;
        }];
        readonly shimmer: {
            readonly delay: 0.1;
            readonly feedback: 0.22;
            readonly wet: 0.16;
            readonly lowpass: 4500;
        };
    };
    /** A muted knock followed by two descending tones — a calm, recoverable refusal. */
    readonly error: {
        readonly masterGain: 0.42;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 850;
            readonly filterQ: 1.1;
            readonly attack: 0.001;
            readonly decay: 0.035;
            readonly peak: 0.13;
        }, {
            readonly kind: "tone";
            readonly waveform: "triangle";
            readonly frequency: 440;
            readonly offset: 0.025;
            readonly attack: 0.004;
            readonly decay: 0.09;
            readonly peak: 0.045;
        }, {
            readonly kind: "tone";
            readonly waveform: "triangle";
            readonly frequency: 349.23;
            readonly offset: 0.1;
            readonly attack: 0.004;
            readonly decay: 0.14;
            readonly peak: 0.04;
        }];
    };
    /** A papery filtered flick with a tiny glass tick — for pages, galleries, and carousels. */
    readonly page: {
        readonly masterGain: 0.38;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "lowpass";
            readonly filterFrequency: 1800;
            readonly filterQ: 0.7;
            readonly attack: 0.006;
            readonly decay: 0.08;
            readonly peak: 0.11;
        }, {
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 4200;
            readonly filterQ: 1.2;
            readonly offset: 0.04;
            readonly attack: 0.004;
            readonly decay: 0.065;
            readonly peak: 0.08;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 2400;
            readonly offset: 0.075;
            readonly attack: 0.002;
            readonly decay: 0.045;
            readonly peak: 0.02;
        }];
    };
    /** A brief unresolved lift — signals that user-initiated work has started. */
    readonly loading: {
        readonly masterGain: 0.42;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "lowpass";
            readonly filterFrequency: 1400;
            readonly filterQ: 0.6;
            readonly attack: 0.035;
            readonly decay: 0.14;
            readonly peak: 0.035;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 420;
            readonly glideTo: 630;
            readonly glideTime: 0.18;
            readonly attack: 0.025;
            readonly decay: 0.18;
            readonly peak: 0.05;
        }];
        readonly shimmer: {
            readonly delay: 0.11;
            readonly feedback: 0.18;
            readonly wet: 0.12;
            readonly lowpass: 2800;
        };
    };
    /** A precise focus tick opening into a soft harmonic bloom — content is ready. */
    readonly ready: {
        readonly masterGain: 0.45;
        readonly layers: [{
            readonly kind: "noise";
            readonly filterType: "bandpass";
            readonly filterFrequency: 3200;
            readonly filterQ: 1.7;
            readonly attack: 0.001;
            readonly decay: 0.018;
            readonly peak: 0.1;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 659.25;
            readonly offset: 0.025;
            readonly attack: 0.012;
            readonly decay: 0.2;
            readonly peak: 0.05;
        }, {
            readonly kind: "tone";
            readonly waveform: "sine";
            readonly frequency: 987.77;
            readonly offset: 0.025;
            readonly attack: 0.012;
            readonly decay: 0.22;
            readonly peak: 0.035;
        }];
        readonly shimmer: {
            readonly delay: 0.13;
            readonly feedback: 0.2;
            readonly wet: 0.13;
            readonly lowpass: 3600;
        };
    };
};
export type SoundName = keyof typeof RECIPES;
export declare function isSoundName(value: unknown): value is SoundName;
/** All available sound names, derived from the recipe palette. */
export declare const sounds: readonly SoundName[];
export {};
