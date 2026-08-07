"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) router.push('/admin');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.message || '登录失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-purple-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 p-10 relative overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

          {/* 图标区 */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-4"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-wider">管理后台</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold tracking-[0.2em] uppercase">Admin Access</p>
          </div>

          {/* 表单区 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="请输入管理员密码"
                autoFocus
                className="w-full pl-12 pr-12 py-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-500 text-sm font-bold flex items-center gap-2"
                >
                  <span className="text-lg">⚠</span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 登录按钮 */}
            <motion.button
              type="submit"
              disabled={loading || !password.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> 验证中...</>
              ) : (
                <>进入后台 <ArrowRight size={18} /></>
              )}
            </motion.button>
          </form>

          {/* 返回首页链接 */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-xs text-slate-400 hover:text-indigo-500 font-bold tracking-widest uppercase transition-colors"
            >
              ← 返回首页
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
