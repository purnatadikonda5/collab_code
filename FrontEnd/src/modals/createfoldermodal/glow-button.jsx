"use client";
import React from "react";
import { motion } from "framer-motion";

export const GlowButton = ({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary",
  size = "md",
  className = "",
  ...props 
}) => {
  const sizeClasses = {
    sm: "py-1 px-4 text-xs",
    md: "py-4 px-5 text-sm",
    lg: "py-2 px-6 text-sm",
  };
  
  const baseClasses = "bg-slate-800 no-underline group cursor-pointer relative shadow-md rounded-full p-px font-semibold leading-6 text-white inline-block";
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>
      <div className={`relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 ${sizeClasses[size]} ring-1 ring-white/10`}>
        {children}
      </div>
      <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
    </motion.button>
  );
};

export const ChevronIcon = () => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.75 8.75L14.25 12L10.75 15.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);