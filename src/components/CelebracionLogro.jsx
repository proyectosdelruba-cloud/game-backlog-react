import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';

export function CelebracionLogro({ visible, juegoNombre }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] glass px-5 py-3.5 flex items-center gap-3 shadow-2xl"
        >
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
            <PartyPopper size={18} strokeWidth={2} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">¡Juego completado!</p>
            <p className="text-xs text-white/60 mt-1">{juegoNombre}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}