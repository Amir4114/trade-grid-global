"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function BackgroundParticles() {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const particles = Array.from({ length: 25 });

  return (
    <div className="absolute inset-0 overflow-hidden">

      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-white/20"

          initial={{
            x: Math.random() * 1600,
            y: Math.random() * 900,
            opacity: 0,
          }}

          animate={{
            y: [null, -100, 100],
            opacity: [0, 1, 0],
          }}

          transition={{
            duration: 8 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

    </div>
  );
}