import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const variants = {
  initial:  { opacity: 0, x: 18 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:     { opacity: 0, x: -18, transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}