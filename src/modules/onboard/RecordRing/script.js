const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

let audioContext, analyser, dataArray;
let isRunning = false;
let animationFrame;

// Setup canvas
function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.zIndex = "-1";
}

// Audio setup
async function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
}

// Draw function
function draw() {
  if (!isRunning) return;

  analyser.getByteFrequencyData(dataArray);

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate average frequency
  const avgFreq = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

  // Dynamic ring properties
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const baseRadius = Math.min(canvas.width, canvas.height) * 0.3;
  const ringThickness = 50 + (avgFreq / 255) * 150;
  const ringRadius = baseRadius + (avgFreq / 255) * 100;
  const rotation = performance.now() / 1000;

  // Create gradient
  const gradient = ctx.createConicGradient(rotation, centerX, centerY);
  gradient.addColorStop(0, `hsl(${(avgFreq / 255) * 360}, 100%, 50%)`);
  gradient.addColorStop(0.5, `hsl(${((avgFreq + 50) / 255) * 360}, 100%, 50%)`);
  gradient.addColorStop(1, `hsl(${(avgFreq / 255) * 360}, 100%, 50%)`);

  // Draw main ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  ctx.lineWidth = ringThickness;
  ctx.strokeStyle = gradient;
  ctx.shadowBlur = ringThickness / 2;
  ctx.shadowColor = `hsl(${(avgFreq / 255) * 360}, 100%, 50%)`;
  ctx.stroke();

  // Draw inner glow
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius - ringThickness / 2, 0, Math.PI * 2);
  ctx.lineWidth = ringThickness / 4;
  ctx.strokeStyle = `hsla(${(avgFreq / 255) * 360}, 100%, 50%, 0.3)`;
  ctx.stroke();

  // Draw outer glow
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius + ringThickness / 2, 0, Math.PI * 2);
  ctx.lineWidth = ringThickness / 4;
  ctx.strokeStyle = `hsla(${(avgFreq / 255) * 360}, 100%, 50%, 0.3)`;
  ctx.stroke();

  animationFrame = requestAnimationFrame(draw);
}

// Toggle audio
async function toggleAudio() {
  if (isRunning) {
    cancelAnimationFrame(animationFrame);
    audioContext.close();
    isRunning = false;
    document.getElementById("toggleButton").textContent = "Start Audio";
  } else {
    await setupAudio();
    isRunning = true;
    document.getElementById("toggleButton").textContent = "Stop Audio";
    draw();
  }
}

// Initialize
setupCanvas();
window.addEventListener("resize", setupCanvas);
document.getElementById("toggleButton").addEventListener("click", toggleAudio);
