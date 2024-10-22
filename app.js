// Global variables
let audioContext, analyser, microphone, eqLow, eqMid, eqHigh;
let isAnalyzing = false;
let mediaRecorder;
let recordedChunks = [];
let lastNotes = [];
let lastChords = [];
const detectPitch = new Pitchfinder.YIN(); // Using YIN pitch detection algorithm from Pitchfinder

// Initialize audio context and set up audio nodes
async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Sets the FFT size for frequency analysis (higher values give more resolution)

    // Create EQ bands using BiquadFilterNode
    eqLow = audioContext.createBiquadFilter();
    eqMid = audioContext.createBiquadFilter();
    eqHigh = audioContext.createBiquadFilter();

    // Configure the EQ filters
    eqLow.type = 'lowshelf'; // Boosts or cuts frequencies below the cutoff
    eqMid.type = 'peaking';  // Boosts or cuts a range of frequencies
    eqHigh.type = 'highshelf'; // Boosts or cuts frequencies above the cutoff

    // Set frequency values for each EQ band
    eqLow.frequency.value = 320;
    eqMid.frequency.value = 1000;
    eqHigh.frequency.value = 3200;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        // Connect the microphone to the EQ filters and then to the analyser
        microphone.connect(eqLow).connect(eqMid).connect(eqHigh).connect(analyser).connect(audioContext.destination);
        showMessage('Microphone connected successfully.', 'success');
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showMessage('Error accessing microphone. Please check permissions.', 'error');
    }
}

// Toggle audio analysis
function toggleAnalysis() {
    isAnalyzing = !isAnalyzing;
    const toggleButton = document.getElementById('toggleButton');
    toggleButton.textContent = isAnalyzing ? 'Stop Analysis' : 'Start Analysis';

    if (isAnalyzing) {
        analyzeAudio(); // Start analyzing audio if toggle is on
    }
}

// Main audio analysis loop
function analyzeAudio() {
    if (!isAnalyzing) return; // Stop if not analyzing

    const bufferLength = analyser.frequencyBinCount; // Number of data points in frequency data
    const dataArray = new Uint8Array(bufferLength); // Create array to hold frequency data
    analyser.getByteFrequencyData(dataArray); // Fill array with frequency data from analyser

    // Update visualizers and analysis functions
    updateFrequencyVisualizer(dataArray);
    updateWaveformVisualizer();
    updateSpectrogramVisualizer(dataArray);
    provideEQSuggestions(dataArray);
    updateMusicalAnalysis();

    setTimeout(analyzeAudio, 500); // Update frequency every 500 ms to reduce CPU load
}

// Update frequency visualizer
function updateFrequencyVisualizer(dataArray) {
    const canvas = document.getElementById('frequencyVisualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas for new drawing
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgb(200, 200, 200)';
    ctx.fillRect(0, 0, width, height);

    const barWidth = (width / dataArray.length) * 2.5; // Calculate width of each bar in the visualizer
    let x = 0;

    // Draw each bar representing a frequency
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height; // Scale the bar height based on frequency value
        const hue = i / dataArray.length * 360; // Set color hue based on frequency position
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1; // Move to the next position for drawing
    }
}

// Update waveform visualizer
function updateWaveformVisualizer() {
    const canvas = document.getElementById('waveformVisualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const dataArray = new Float32Array(analyser.fftSize); // Create array to hold time domain data
    analyser.getFloatTimeDomainData(dataArray); // Fill array with time domain data from analyser

    // Clear the canvas for new drawing
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 255, 0)';
    ctx.beginPath();

    const sliceWidth = width * 1.0 / dataArray.length; // Calculate width of each slice
    let x = 0;

    // Draw the waveform
    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] * 0.5;
        const y = height / 2 + v * height / 2;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth; // Move to the next position for drawing
    }

    ctx.lineTo(width, height / 2); // Finish the line at the center
    ctx.stroke();
}

// Update spectrogram visualizer
function updateSpectrogramVisualizer(dataArray) {
    const canvas = document.getElementById('spectrogramVisualizer');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Scroll the canvas to the left by copying existing image
    ctx.drawImage(canvas, -1, 0);

    const barHeight = height / dataArray.length;
    for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const hue = (value / 255) * 360; // Set color hue based on frequency value
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(width - 1, height - i * barHeight, 1, barHeight); // Draw the new column on the right
    }
}

// Provide EQ suggestions based on frequency analysis
function provideEQSuggestions(dataArray) {
    // Calculate average values for low, mid, and high frequency bands
    const lowEnd = dataArray.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
    const midRange = dataArray.slice(20, 60).reduce((a, b) => a + b, 0) / 40;
    const highEnd = dataArray.slice(60).reduce((a, b) => a + b, 0) / (dataArray.length - 60);

    const skillLevel = document.getElementById('skillLevel').value;
    let suggestions = '';

    // Provide EQ suggestions based on balance between frequency bands
    if (lowEnd > midRange * 1.5 && lowEnd > highEnd * 1.5) {
        suggestions += getDetailedSuggestion('low', 'reduce', skillLevel, lowEnd, midRange, highEnd);
    } else if (lowEnd < midRange * 0.5 && lowEnd < highEnd * 0.5) {
        suggestions += getDetailedSuggestion('low', 'boost', skillLevel, lowEnd, midRange, highEnd);
    }

    if (midRange > lowEnd * 1.5 && midRange > highEnd * 1.5) {
        suggestions += getDetailedSuggestion('mid', 'reduce', skillLevel, lowEnd, midRange, highEnd);
    } else if (midRange < lowEnd * 0.5 && midRange < highEnd * 0.5) {
        suggestions += getDetailedSuggestion('mid', 'boost', skillLevel, lowEnd, midRange, highEnd);
    }

    if (highEnd > lowEnd * 1.5 && highEnd > midRange * 1.5) {
        suggestions += getDetailedSuggestion('high', 'reduce', skillLevel, lowEnd, midRange, highEnd);
    } else if (highEnd < lowEnd * 0.5 && highEnd < midRange * 0.5) {
        suggestions += getDetailedSuggestion('high', 'boost', skillLevel, lowEnd, midRange, highEnd);
    }

    if (!suggestions) {
        suggestions = 'The frequency balance looks good. No major EQ adjustments needed.';
    }

    document.getElementById('eqSuggestions').textContent = suggestions;
}

// Get detailed EQ suggestion based on band, action, skill level, and frequency analysis
function getDetailedSuggestion(band, action, skillLevel, lowEnd, midRange, highEnd) {
    const suggestions = {
        novice: {
            low: { boost: 'Try increasing the low knob slightly to add warmth to your mix. Consider boosting between 80-100Hz.', reduce: 'The low frequencies are overpowering. Try reducing the low knob slightly.' },
            mid: { boost: 'Consider boosting the mid knob slightly for better vocal clarity. Aim for around 1kHz.', reduce: 'The mid frequencies seem harsh. Reduce the mid knob slightly, focusing on 800-1000Hz.' },
            high: { boost: 'The high end could use a small increase for more brightness. Boost gently around 6-10kHz.', reduce: 'The high end might be too harsh. Reduce the high knob a bit, especially in the 8-12kHz range.' }
        },
        beginner: {
            low: { boost: 'Boost the low frequencies a bit (80-120Hz) for more warmth.', reduce: 'The low frequencies are muddy. Reduce them slightly, especially below 100Hz.' },
            mid: { boost: 'Increase the mids (800Hz - 1.5kHz) to add more presence, especially for vocals.', reduce: 'The mids are too boxy. Reduce them in the 500-1000Hz range.' },
            high: { boost: 'Boost the highs (6-10kHz) for more clarity.', reduce: 'Reduce the highs to soften the sound, especially if they feel too sharp in the 8-12kHz range.' }
        },
        intermediate: {
            low: { boost: 'Try a gentle boost around 100Hz for more warmth, and consider using a wide Q for smoother transition.', reduce: 'The low frequencies are overpowering the mix. Consider cutting around 150-300Hz to reduce muddiness.' },
            mid: { boost: 'A slight boost around 1kHz can add presence, especially to vocals or guitars.', reduce: 'Try a small cut around 800Hz to reduce boxiness. This helps with clarity.' },
            high: { boost: 'Boost around 5kHz to 8kHz for more definition, particularly for percussive elements.', reduce: 'If there is too much sibilance, try cutting in the 5-7kHz range.' }
        },
        advanced: {
            low: { boost: 'Experiment with a 2-3dB boost at 80Hz with a wide Q to add punch without creating muddiness.', reduce: 'Consider using a high-pass filter at 50Hz to clean up the low end and remove unwanted rumble.' },
            mid: { boost: 'Consider a 1-2dB boost at 2.5kHz to bring forward the presence of vocals and lead instruments.', reduce: 'Apply a 2dB cut at 400Hz to reduce boxiness, especially if the mix sounds congested.' },
            high: { boost: 'Add a high shelf of 2dB at 10kHz for air and openness.', reduce: 'Use a peak filter to reduce 2-3dB at 6kHz to tame harshness or excessive brightness.' }
        },
        expert: {
            low: { boost: 'For a more refined low end, use parallel compression on the low frequencies, and boost around 60-80Hz.', reduce: 'Use multiband compression to dynamically control low-end buildup, focusing around 80-150Hz.' },
            mid: { boost: 'Experiment with mid-side EQ to enhance the stereo image in the mids. Boost the side signal at 1.5-2kHz.', reduce: 'Consider dynamic EQ to attenuate problematic mid frequencies only when they become too prominent, around 400-800Hz.' },
            high: { boost: 'Use a Pultec-style EQ emulation for smooth high-end boost, especially in the 10-12kHz range.', reduce: 'Experiment with a de-esser or dynamic EQ for precise control of harsh sibilant frequencies, particularly in vocals.' }
        }
    };

    let additionalInsight = '';
    if (action === 'boost') {
        additionalInsight = ` You could also use compression to balance out the dynamics if you are boosting this frequency range, particularly at ${band} frequencies.`;
    } else if (action === 'reduce') {
        additionalInsight = ` Try using a notch filter if the issue persists, as it can help in precisely reducing problem frequencies without affecting the surrounding sound.`;
    }

    return suggestions[skillLevel][band][action] + additionalInsight + ' ';
}

// Update musical analysis
function updateMusicalAnalysis() {
    // Get real-time waveform data to detect pitch
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const pitch = detectPitch(buffer, audioContext.sampleRate); // Detect pitch using YIN algorithm

    if (pitch) {
        const note = getNoteFromPitch(pitch);
        document.getElementById('pitchDisplay').textContent = `Pitch: ${pitch.toFixed(2)} Hz (${note})`;
        lastNotes.push(note);
        if (lastNotes.length > 10) lastNotes.shift(); // Keep only the last 10 notes
        document.getElementById('noteHistory').textContent = lastNotes.join(', ');
    }
}

// Convert pitch frequency to musical note
function getNoteFromPitch(frequency) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const noteNumber = 12 * (Math.log(frequency / A4) / Math.log(2));
    const noteIndex = Math.round(noteNumber) % 12;
    const octave = Math.floor(noteNumber / 12) + 4;
    return noteNames[noteIndex] + octave; // Return the note name with octave
}

// Show status messages
function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = type;
    messageElement.style.display = 'block';
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupAudio().catch(console.error);
    document.getElementById('toggleButton').addEventListener('click', toggleAnalysis);
    document.getElementById('eqLow').addEventListener('input', updateEQ);
    document.getElementById('eqMid').addEventListener('input', updateEQ);
    document.getElementById('eqHigh').addEventListener('
