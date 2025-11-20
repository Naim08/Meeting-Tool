// Transcript Floating Window Renderer
// Real-time waveform visualization and transcript display

(function () {
  "use strict";

  // Canvas and animation state
  let canvas = null;
  let ctx = null;
  let animationFrameId = null;
  let animationOffset = 0;

  // Audio level state
  let microphoneLevel = 0;
  let systemAudioLevel = 0;
  let targetMicLevel = 0;
  let targetSystemLevel = 0;

  // Transcript state
  const transcriptSegments = [];
  const MAX_SEGMENTS = 100;

  // DOM elements
  let transcriptFeed = null;
  let micLevelBar = null;
  let systemLevelBar = null;

  // Initialize the window
  function initialize() {
    // Get DOM elements
    canvas = document.getElementById("waveform-canvas");
    ctx = canvas.getContext("2d");
    transcriptFeed = document.getElementById("transcript-feed");
    micLevelBar = document.getElementById("mic-level");
    systemLevelBar = document.getElementById("system-level");

    // Set up event listeners
    setupEventListeners();

    // Set up IPC listeners
    setupIPCListeners();

    // Start animation loop
    startAnimation();

    console.log("[TranscriptWindow] Initialized");
  }

  function setupEventListeners() {
    // Control buttons
    document.getElementById("btn-stop").addEventListener("click", () => {
      window.transcriptAPI.stop();
    });

    document.getElementById("btn-clear").addEventListener("click", () => {
      window.transcriptAPI.clear();
    });

    document.getElementById("btn-position").addEventListener("click", () => {
      window.transcriptAPI.togglePosition();
    });

    document.getElementById("btn-minimize").addEventListener("click", () => {
      window.transcriptAPI.minimize();
    });

    // Make header draggable (handled by Electron via -webkit-app-region)
    const dragRegion = document.getElementById("drag-region");
    dragRegion.style.webkitAppRegion = "drag";

    // Buttons should not be draggable
    const buttons = document.querySelectorAll(".control-btn, .action-btn");
    buttons.forEach((btn) => {
      btn.style.webkitAppRegion = "no-drag";
    });
  }

  function setupIPCListeners() {
    // Audio levels for waveform visualization
    window.transcriptAPI.onAudioLevels((data) => {
      targetMicLevel = data.microphone;
      targetSystemLevel = data.system;
    });

    // Transcript updates
    window.transcriptAPI.onTranscriptUpdate((data) => {
      addTranscriptSegment(data);
    });

    // Clear transcript
    window.transcriptAPI.onClearTranscript(() => {
      clearTranscript();
    });

    // Position changed
    window.transcriptAPI.onPositionChanged((position) => {
      console.log(`[TranscriptWindow] Position changed to: ${position}`);
    });
  }

  // Animation loop for waveform visualization
  function startAnimation() {
    function animate() {
      // Smooth level transitions
      microphoneLevel += (targetMicLevel - microphoneLevel) * 0.2;
      systemAudioLevel += (targetSystemLevel - systemAudioLevel) * 0.2;

      // Update level bars
      updateLevelBars();

      // Draw waveform
      drawWaveform();

      // Increment animation offset for wave motion
      animationOffset += 0.1;

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function updateLevelBars() {
    if (micLevelBar) {
      micLevelBar.style.width = `${Math.min(100, microphoneLevel)}%`;
    }
    if (systemLevelBar) {
      systemLevelBar.style.width = `${Math.min(100, systemAudioLevel)}%`;
    }
  }

  function drawWaveform() {
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    // Draw microphone waveform (top half, blue)
    drawSineWave(ctx, {
      yOffset: midY / 2,
      amplitude: microphoneLevel * 0.4,
      color: "rgba(59, 130, 246, 0.8)",
      gradientColor: "rgba(59, 130, 246, 0.2)",
      frequency: 0.03,
      phase: animationOffset,
      width,
      height: midY,
    });

    // Draw system audio waveform (bottom half, green)
    drawSineWave(ctx, {
      yOffset: midY + midY / 2,
      amplitude: systemAudioLevel * 0.4,
      color: "rgba(34, 197, 94, 0.8)",
      gradientColor: "rgba(34, 197, 94, 0.2)",
      frequency: 0.04,
      phase: -animationOffset * 1.2,
      width,
      height: midY,
    });

    // Draw center line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
  }

  function drawSineWave(ctx, options) {
    const { yOffset, amplitude, color, gradientColor, frequency, phase, width, height } = options;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude);
    gradient.addColorStop(0, gradientColor);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, gradientColor);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Draw sine wave
    for (let x = 0; x < width; x++) {
      // Multi-frequency sine wave for more natural look
      const y1 = Math.sin((x + phase) * frequency) * amplitude;
      const y2 = Math.sin((x + phase * 1.5) * frequency * 2) * (amplitude * 0.3);
      const y3 = Math.sin((x + phase * 0.7) * frequency * 0.5) * (amplitude * 0.5);

      const y = yOffset + y1 + y2 + y3;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Fill area under the wave
    ctx.lineTo(width, yOffset);
    ctx.lineTo(0, yOffset);
    ctx.closePath();
    ctx.fillStyle = gradientColor;
    ctx.fill();
  }

  function addTranscriptSegment(data) {
    const { text, speaker, source, isFinal, timestamp, confidence } = data;

    // Remove placeholder if present
    const placeholder = transcriptFeed.querySelector(".transcript-placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    // Create segment element
    const segment = document.createElement("div");
    segment.className = `transcript-segment ${source} ${isFinal ? "final" : "partial"}`;

    // Speaker label
    const speakerLabel = document.createElement("span");
    speakerLabel.className = `speaker-label ${getSpeakerClass(speaker, source)}`;
    speakerLabel.textContent = speaker || (source === "microphone" ? "You" : "Remote");
    segment.appendChild(speakerLabel);

    // Text content
    const textContent = document.createElement("span");
    textContent.className = "segment-text";
    textContent.textContent = text;
    segment.appendChild(textContent);

    // Timestamp
    const timeLabel = document.createElement("span");
    timeLabel.className = "timestamp";
    timeLabel.textContent = formatTimestamp(timestamp);
    segment.appendChild(timeLabel);

    // Low confidence indicator
    if (confidence !== undefined && confidence < 0.7) {
      segment.classList.add("low-confidence");
    }

    // Add to feed
    transcriptSegments.push({ element: segment, data });
    transcriptFeed.appendChild(segment);

    // Limit total segments
    if (transcriptSegments.length > MAX_SEGMENTS) {
      const oldest = transcriptSegments.shift();
      oldest.element.remove();
    }

    // Auto-scroll to bottom
    transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
  }

  function getSpeakerClass(speaker, source) {
    if (!speaker) {
      return source === "microphone" ? "interviewer" : "interviewee";
    }

    const lowerSpeaker = speaker.toLowerCase();
    if (
      lowerSpeaker.includes("interviewer") ||
      lowerSpeaker.includes("you") ||
      lowerSpeaker === "speaker 0"
    ) {
      return "interviewer";
    }

    return "interviewee";
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function clearTranscript() {
    transcriptSegments.length = 0;
    transcriptFeed.innerHTML = '<div class="transcript-placeholder">Waiting for speech...</div>';
    console.log("[TranscriptWindow] Transcript cleared");
  }

  // Cleanup on window close
  window.addEventListener("beforeunload", () => {
    stopAnimation();
    window.transcriptAPI.removeAllListeners();
  });

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
