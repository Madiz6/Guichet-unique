import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 360]);

  const onTouchStart = useCallback((e) => {
    // Only activate if we're at the top of the scroll container
    const scroller = e.currentTarget;
    if (scroller.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      y.set(0);
      return;
    }
    // rubber-band damping
    y.set(Math.min(delta * 0.5, THRESHOLD * 1.2));
  }, [refreshing, y]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;

    if (y.get() >= THRESHOLD * 0.85 && !refreshing) {
      setRefreshing(true);
      animate(y, THRESHOLD * 0.6, { duration: 0.15 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(y, 0, { duration: 0.3 });
      }
    } else {
      animate(y, 0, { duration: 0.25 });
    }
  }, [refreshing, y, onRefresh]);

  return (
    <div
      className="relative w-full h-full overflow-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        style={{ y, opacity }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
      >
        <div className="mt-2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-[#E5E7EB]">
          <motion.div style={{ rotate }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "text-blue-500 animate-spin" : "text-[#6B6B6B]"}`} />
          </motion.div>
        </div>
      </motion.div>

      {/* Page content pushed down while pulling */}
      <motion.div style={{ y }} className="w-full">
        {children}
      </motion.div>
    </div>
  );
}