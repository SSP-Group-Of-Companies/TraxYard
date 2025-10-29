"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const checkPageHeight = () => {
      // Check if the page content is tall enough to warrant sticky footer
      // This prevents the footer from covering content on short pages
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Only make sticky if the document is significantly taller than viewport
      // Using 1.2x multiplier to ensure there's enough content to scroll
      setIsSticky(documentHeight > viewportHeight * 1.2);
    };

    // Check on mount and resize
    checkPageHeight();
    window.addEventListener('resize', checkPageHeight);
    
    // Also check when content changes (for dynamic content)
    const observer = new MutationObserver(checkPageHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', checkPageHeight);
      observer.disconnect();
    };
  }, []);

  return (
    <footer 
      className={`w-full bg-[#0b1a2a] text-center text-white py-3 text-xs sm:text-sm ${
        isSticky ? 'sticky bottom-0 z-10' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1">
        <p className="font-semibold tracking-tight">
          © {new Date().getFullYear()} SSP Group of Companies. All rights
          reserved.
        </p>
        <p className="text-gray-300">
          TraxYard – Internal Trailer Management System
        </p>
      </div>
    </footer>
  );
}
