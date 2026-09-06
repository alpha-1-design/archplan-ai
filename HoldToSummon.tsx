import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';

const HOLD_MS = 450;
const CLICKABLE = 'button, a, input, textarea, select, [role="button"], [data-no-summon]';

export function HoldToSummon() {
  const viewMode = useAppStore((s) => s.viewMode);
  const startHold = useAppStore((s) => s.startHold);
  const advanceHold = useAppStore((s) => s.advanceHold);
  const completeHold = useAppStore((s) => s.completeHold);
  const cancelHold = useAppStore((s) => s.cancelHold);
  const activateVoice = useAppStore((s) => s.activateVoice);

  const [charge, setCharge] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [burst, setBurst] = useState(false);
  const stateRef = useRef<'idle' | 'charging' | 'summoned'>('idle');
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const originRef = useRef({ x: 0, y: 0 });

  const active = viewMode !== 'ai';

  useEffect(() => {
    if (!active) return;

    const isInteractive = (target: EventTarget | null): boolean =>
      target instanceof Element && !!target.closest(CLICKABLE);

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (stateRef.current !== 'idle' || isInteractive(target)) return;
      stateRef.current = 'charging';
      originRef.current = { x, y };
      startRef.current = performance.now();
      setPos({ x, y });
      startHold();
      loop();
    };

    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / HOLD_MS);
      setCharge(p);
      advanceHold(p);
      if (p >= 1) {
        summon();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const summon = () => {
      stateRef.current = 'summoned';
      setBurst(true);
      completeHold();
      setCharge(0);
      window.setTimeout(() => activateVoice(), 380);
      window.setTimeout(() => {
        setBurst(false);
        stateRef.current = 'idle';
      }, 700);
    };

    const move = (e: PointerEvent) => {
      if (stateRef.current !== 'charging') return;
      setPos({ x: e.clientX, y: e.clientY });
      // Moving the pointer cancels the charge — summon means hold still.
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      if (Math.hypot(dx, dy) > 14) {
        stateRef.current = 'idle';
        cancelAnimationFrame(rafRef.current);
        setCharge(0);
        cancelHold();
      }
    };

    const finish = () => {
      if (stateRef.current !== 'charging') return;
      stateRef.current = 'idle';
      setCharge(0);
      cancelHold();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      begin(e.clientX, e.clientY, e.target);
    };
    const onPointerUp = () => finish();
    const onPointerCancel = () => finish();

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startHold, advanceHold, completeHold, cancelHold, activateVoice]);

  return (
    <AnimatePresence>
      {(charge > 0.04 || burst) && (
        <div className="fixed inset-0 z-[70] pointer-events-none select-none">
          {/* dim backdrop that deepens with charge */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at var(--sx) var(--sy), rgba(0,212,255,0.10), rgba(2,6,12,0.55) 40%, rgba(2,6,12,0.75) 100%)',
              ['--sx' as string]: `${pos.x}px`,
              ['--sy' as string]: `${pos.y}px`,
            }}
            animate={{ opacity: charge * 0.9 }}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* summon ring cluster */}
          <div className="absolute" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)' }}>
            {/* progress arc */}
            <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
              <circle cx="66" cy="66" r="56" fill="none" stroke="rgba(0,212,255,0.12)" strokeWidth="2" />
              <motion.circle
                cx="66" cy="66" r="56" fill="none"
                stroke="#00d4ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - charge)}
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.8))' }}
              />
            </svg>

            {/* rotating dashed ring */}
            {charge > 0.15 && (
              <motion.div
                className="absolute inset-0 rounded-full border border-dashed border-cyan/30"
                style={{ width: 148, height: 148, left: -8, top: -8 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* charging core */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 46, height: 46, left: -23, top: -23,
                background: 'radial-gradient(circle at 38% 32%, rgba(150,225,255,0.95) 0%, rgba(0,170,220,0.45) 45%, transparent 78%)',
                boxShadow: `0 0 ${18 + charge * 46}px rgba(0,212,255,${0.35 + charge * 0.5})`,
              }}
              animate={{ scale: 0.75 + charge * 0.55 }}
            />

            {/* summon burst */}
            {burst && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border border-cyan/60"
                    style={{ width: 46, height: 46, left: -23, top: -23 }}
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 4.2 + i * 1.6, opacity: 0 }}
                    transition={{ duration: 0.55, delay: i * 0.08, ease: 'easeOut' }}
                  />
                ))}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 46, height: 46, left: -23, top: -23,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(0,212,255,0.5) 35%, transparent 75%)',
                  }}
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 5.5, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </>
            )}
          </div>

          {/* hint label */}
          {charge > 0.35 && !burst && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-16 text-[10px] font-mono tracking-[0.35em] text-cyan/80 uppercase"
              style={{ textShadow: '0 0 12px rgba(0,212,255,0.6)' }}
            >
              Summoning Arch
            </motion.p>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
