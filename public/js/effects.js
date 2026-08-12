// Celebration effects: a synthesized chime (no audio assets — browsers
// allow audio after any user gesture, which joining provides) and a small
// dependency-free confetti burst.
'use strict';

let audioCtx = null;
function chime(kind = 'solve') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = {
      solve: [523.25, 659.25, 783.99],        // C5 E5 G5 — bright triad
      finish: [523.25, 659.25, 783.99, 1046.5],
      warn: [440, 349.23],                     // A4 F4 — uh-oh
      notify: [587.33],                        // D5 — single ping
    }[kind] || [587.33];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = audioCtx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  } catch { /* audio blocked — fine, purely cosmetic */ }
}

function confetti(durationMs = 2500) {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#e0a83c', '#4caf6e', '#5b8dd9', '#d9534f', '#b678d9'];
  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (now - start < durationMs) requestAnimationFrame(frame);
    else canvas.remove();
  })(start);
}
