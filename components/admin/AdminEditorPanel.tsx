"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, MessageSquare, Tag, Layers, Plus,
  Eye, Focus, Save, Loader2, ArrowLeft, Type, Hash,
  CheckCircle2, AlertCircle, Keyboard
} from 'lucide-react';
import RichTextEditor, { RichTextEditorHandle } from '../editor/RichTextEditor';

interface Draft {
  id: string;
  title: string;
  type: 'post' | 'chatter';
  date: string;
  tags: string[];
  cover: string;
  description: string;
  mood?: string;
}

interface Stats {
  posts: number;
  chatters: number;
  tags: number;
  total: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function AdminEditorPanel() {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [stats, setStats] = useState<Stats>({ posts: 0, chatters: 0, tags: 0, total: 0 });

  // Editor state
  const [editId, setEditId] = useState<string>('new');
  const [editType, setEditType] = useState<'post' | 'chatter'>('post');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [cover, setCover] = useState('');
  const [summary, setSummary] = useState('');
  const [mood, setMood] = useState('');
  const [content, setContent] = useState('');
  const [contentLoaded, setContentLoaded] = useState(false);

  // UI state
  const [focusMode, setFocusMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [tagInput, setTagInput] = useState('');

  const editorRef = useRef<RichTextEditorHandle>(null);
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/drafts/list');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Load draft for editing
  const loadDraft = useCallback(async (id: string, type: 'post' | 'chatter') => {
    setEditId(id);
    setEditType(type);
    setContentLoaded(false);
    setSaveStatus('idle');
    setLastSaved(null);
    setWordCount({ words: 0, chars: 0 });

    if (id !== 'new') {
      try {
        const res = await fetch('/api/drafts/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, type }),
        });
        const data = await res.json();
        if (data.success) {
          setTitle(data.draft.title || '');
          setTags(data.draft.tags || []);
          setCover(data.draft.cover || '');
          setSummary(data.draft.description || '');
          setMood(data.draft.mood || '');
          setContent(data.draft.content || '');
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    } else {
      setTitle('');
      setTags([]);
      setCover('');
      setSummary('');
      setMood('');
      setContent('');
    }
    setContentLoaded(true);
    setView('editor');
  }, []);

  // Save draft
  const handleSave = useCallback(async (isPublish: boolean = false) => {
    if (!title.trim() && editType !== 'about') {
      setSaveStatus('error');
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');

    const payload = {
      id: editId === 'new' ? null : editId,
      type: editType,
      title,
      tags,
      cover,
      mood: editType === 'chatter' ? mood : null,
      description: summary,
      content: editorRef.current?.getContent() || '',
      published: isPublish,
    };

    try {
      const res = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        setLastSaved(now);
        setSaveStatus('saved');
        if (editId === 'new' && data.id) {
          setEditId(data.id);
        }
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    }

    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
  }, [editId, editType, title, tags, cover, mood, summary]);

  // Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (view === 'editor') {
          handleSave(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleSave]);

  // Add tag
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  // Reading time estimate (200 wpm for Chinese ~ 400 chars/min)
  const readingTime = Math.max(1, Math.ceil(wordCount.chars / 400));

  // ===================== List View =====================
  const renderListView = () => (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '文章', value: stats.posts, icon: FileText, color: 'from-blue-500 to-cyan-500' },
          { label: '杂谈', value: stats.chatters, icon: MessageSquare, color: 'from-purple-500 to-pink-500' },
          { label: '标签', value: stats.tags, icon: Tag, color: 'from-amber-500 to-orange-500' },
          { label: '总篇数', value: stats.total, icon: Layers, color: 'from-emerald-500 to-teal-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-slate-700/50 p-5 shadow-lg">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md mb-3`}>
              <stat.icon className="text-white" size={20} />
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</div>
            <div className="text-xs font-bold text-slate-400 tracking-wide uppercase">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Draft Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { setEditType('post'); loadDraft('new', 'post'); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          <Plus size={18} /> 新建文章
        </button>
        <button
          onClick={() => { setEditType('chatter'); loadDraft('new', 'chatter'); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-black shadow-lg shadow-purple-500/30 transition-all active:scale-95"
        >
          <Plus size={18} /> 新建杂谈
        </button>
      </div>
    </div>
  );

  // ===================== Editor View =====================
  const renderEditorView = () => (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); loadStats(); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${editType === 'chatter' ? 'bg-purple-500/15 text-purple-500' : 'bg-blue-500/15 text-blue-500'}`}>
            {editType === 'chatter' ? '杂谈' : '文章'}
          </span>
          <span className="text-sm font-bold text-slate-400">{editId === 'new' ? '新建' : editId}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveStatus === 'saving' && <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500"><Loader2 size={14} className="animate-spin" /> 保存中...</span>}
          {saveStatus === 'saved' && lastSaved && <span className="flex items-center gap-1.5 text-xs font-bold text-green-500"><CheckCircle2 size={14} /> 已保存 {lastSaved}</span>}
          {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-xs font-bold text-red-500"><AlertCircle size={14} /> 保存失败</span>}

          {/* Focus Mode */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2 rounded-lg transition-colors ${focusMode ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10'}`}
            title="专注模式"
          >
            <Focus size={18} />
          </button>

          {/* Preview Mode */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`p-2 rounded-lg transition-colors ${previewMode ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10'}`}
            title="预览模式"
          >
            <Eye size={18} />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Save Draft */}
          <button
            onClick={() => handleSave(false)}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors active:scale-95"
          >
            <Save size={14} /> 保存草稿
          </button>

          {/* Publish */}
          <button
            onClick={() => handleSave(true)}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 发布
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ${focusMode ? 'lg:flex-1' : ''}`}>
          {/* Title Input */}
          <div className="shrink-0 px-8 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={editType === 'chatter' ? '杂谈标题...' : '文章标题...'}
              className="w-full bg-transparent text-2xl font-black text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Rich Text Editor or Preview */}
          <div className="flex-1 overflow-hidden">
            {previewMode ? (
              <div className="h-full overflow-y-auto px-12 py-8">
                <div className="prose prose-slate dark:prose-invert prose-lg max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: editorRef.current?.getContent() || content }} />
              </div>
            ) : (
              contentLoaded && (
                <RichTextEditor
                  ref={editorRef}
                  title={title}
                  setTitle={setTitle}
                  initialContent={content}
                  onWordCount={(stats) => setWordCount(stats)}
                />
              )
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="shrink-0 flex items-center justify-between px-6 py-2 bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
            <div className="flex items-center gap-4 text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Type size={12} /> {wordCount.words} 字</span>
              <span className="flex items-center gap-1"><Hash size={12} /> {wordCount.chars} 字符</span>
              <span className="flex items-center gap-1"><Clock size={12} /> 约 {readingTime} 分钟</span>
            </div>
            <div className="flex items-center gap-3">
              {lastSaved ? (
                <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle2 size={11} /> {lastSaved}</span>
              ) : (
                <span className="text-slate-400 font-bold">未保存</span>
              )}
              <span className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
                <Keyboard size={11} /> Ctrl+S 保存
              </span>
            </div>
          </div>
        </div>

        {/* Right Properties Panel */}
        {!focusMode && (
          <aside className="w-80 shrink-0 border-l border-slate-200/50 dark:border-slate-700/50 overflow-y-auto bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl">
            <div className="p-5 flex flex-col gap-5">
              {/* Cover */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">封面图</label>
                <input
                  type="text"
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  placeholder="https://..."
                  className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                />
                {cover && <img src={cover} alt="封面预览" className="w-full h-32 object-cover rounded-xl mt-1" />}
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">摘要</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="一句话描述..."
                  rows={3}
                  className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
                />
              </div>

              {/* Mood (chatter only) */}
              {editType === 'chatter' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">心情</label>
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="此刻的心情..."
                    className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                  />
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">标签</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="输入标签后回车"
                    className="flex-1 px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                  />
                  <button onClick={addTag} className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-indigo-500/10 px-3 py-1 rounded-full">
                        {tag}
                        <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );

  // ===================== Main Render =====================
  return (
    <div className="h-full">
      {view === 'list' ? renderListView() : renderEditorView()}
    </div>
  );
}
