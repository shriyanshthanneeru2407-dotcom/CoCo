// Web Audio API synthesizer for premium chat sound effects (no asset loading needed)
export function playChatSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (ctx.state === 'suspended') {
      // Browsers restrict audio playback until a user interaction occurs
      // We attempt to resume if context was suspended
      ctx.resume();
    }

    if (type === 'sent') {
      // Outgoing: quick, snappy high-frequency pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'received') {
      // Incoming: pleasant, warm double chime (ding-dong tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.07); // A5
      gain2.gain.setValueAtTime(0.06, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07 + 0.16);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.07 + 0.18);
    }
  } catch (err) {
    console.warn('Audio Context playback blocked or unsupported:', err);
  }
}
