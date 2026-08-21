"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { siteConfig } from '../siteConfig';

export default function Navbar() {
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) setShowNav(false);
      else setShowNav(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navLinks = [
    { name: '首页', href: '/' },
    { name: '项目', href: '/projects' },
    { name: '归档', href: '/timeline' },
    { name: '照片墙', href: '/photowall' },
    { name: '音乐', href: '/music' },
    { name: '说说', href: '/moments' },
    { name: '杂谈', href: '/chatter' },
    { name: '🌳 灵境', href: '/tree' },
    { name: '友链', href: '/friends' },
    { name: '关于', href: '/about' },
  ];

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.minimize_window();
    }
  };
  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.maximize_window();
    }
  };
  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.close_window();
    }
  };

  return (
    <header className={`w-full fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${showNav ? 'translate-y-0' : '-translate-y-full'} bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border-white/20 dark:border-white/5 shadow-sm pywebview-drag-region`}>
      <div className="w-[95%] max-w-7xl mx-auto h-16 flex items-center justify-between px-4 box-border">

        <Link href="/" className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
          {siteConfig.navTitle}
          <span className="text-indigo-500 mx-1">
            {siteConfig.navSuffix || 'の'}
          </span>
          {siteConfig.navAfter}
        </Link>

        <div className="flex items-center gap-6" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <nav className="hidden lg:flex gap-8 text-sm font-bold">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`relative py-1 transition-colors ${pathname === link.href ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-2 pl-6 border-l border-slate-300/50 dark:border-slate-600/50">
            <button onClick={handleMinimize} className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-yellow-900 font-black">-</span>
            </button>
            <button onClick={handleMaximize} className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-green-900 font-black">+</span>
            </button>
            <button onClick={handleClose} className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-red-900 font-black">×</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
