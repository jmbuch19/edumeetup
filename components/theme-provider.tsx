"use client";

import { motion, MotionConfig } from "framer-motion";

// These values match the "Spring" feel we discussed for edumeetup.com
const GLOBAL_TRANSITION = {
    type: "spring",
    stiffness: 260,
    damping: 20,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <MotionConfig transition={GLOBAL_TRANSITION}>
            {/* Since you use Shadcn, this provider ensures Framer Motion 
        animations and Shadcn transitions share the same "vibe".
      */}
            <div className="min-h-screen bg-background text-foreground antialiased">
                {children}
            </div>
        </MotionConfig>
    );
}
