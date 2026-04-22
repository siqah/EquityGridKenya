import { motion } from 'framer-motion';

const v = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export default function PageFade({ children, className = '' }) {
  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      transition={v.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
