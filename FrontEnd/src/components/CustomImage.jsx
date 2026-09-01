"use client";
import React, { useState } from "react";

// CustomImage component that can be used as a replacement for next/image
export const CustomImage = ({
  src,
  alt,
  width,
  height,
  className,
  draggable = true,
  objectFit = "cover",
  objectPosition = "center",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <div
      className={`relative ${className || ""}`}
      style={{
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "auto",
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-neutral-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-neutral-600 border-t-gray-600 dark:border-t-neutral-300"></div>
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt || "Image"}
          onLoad={handleLoad}
          onError={handleError}
          draggable={draggable}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 h-full w-full rounded-2xl`}
          style={{
            objectFit,
            objectPosition,
          }}
        />
      )}
    </div>
  );
};