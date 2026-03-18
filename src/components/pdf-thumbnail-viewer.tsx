"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface ResearchThumbnailProps {
  fileUrl: string;
  coverImageUrl: string;
  title: string;
}

const springTransition = { type: "spring" as const, stiffness: 260, damping: 18 };

export function ResearchThumbnail({
  fileUrl,
  coverImageUrl,
  title,
}: ResearchThumbnailProps) {
  return (
    <motion.a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block w-full cursor-pointer"
      aria-label={`Open PDF: ${title}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      {/* Page 4 — furthest back */}
      <motion.div
        className="absolute inset-0 rounded-xl border border-border/20 bg-white/20 shadow-sm"
        variants={{
          rest: { x: 0, y: 0, rotate: 0, opacity: 0 },
          hover: { x: 28, y: 6, rotate: 5, opacity: 1 },
        }}
        transition={springTransition}
      />
      {/* Page 3 */}
      <motion.div
        className="absolute inset-0 rounded-xl border border-border/30 bg-white/50 shadow-sm"
        variants={{
          rest: { x: 0, y: 0, rotate: 0, opacity: 0 },
          hover: { x: 20, y: 4, rotate: 3.5, opacity: 1 },
        }}
        transition={springTransition}
      />
      {/* Page 2 */}
      <motion.div
        className="absolute inset-0 rounded-xl border border-border/40 bg-white/70 shadow-sm"
        variants={{
          rest: { x: 0, y: 0, rotate: 0, opacity: 0 },
          hover: { x: 12, y: 2, rotate: 2, opacity: 1 },
        }}
        transition={springTransition}
      />
      {/* Page 1 — just behind the main card */}
      <motion.div
        className="absolute inset-0 rounded-xl border border-border/50 bg-white/90 shadow-sm"
        variants={{
          rest: { x: 0, y: 0, rotate: 0, opacity: 0 },
          hover: { x: 6, y: 1, rotate: 0.8, opacity: 1 },
        }}
        transition={springTransition}
      />

      {/* Main thumbnail card */}
      <motion.div
        className="relative z-10 overflow-hidden rounded-xl border border-border/60 shadow-sm"
        variants={{
          rest: { rotate: 0, x: 0, scale: 1 },
          hover: { rotate: -3, x: -6, scale: 1.02 },
        }}
        transition={springTransition}
      >
        <Image
          src={coverImageUrl}
          alt={`Cover for ${title}`}
          width={300}
          height={400}
          unoptimized
          className="aspect-3/4 w-full object-cover"
        />
      </motion.div>
    </motion.a>
  );
}
