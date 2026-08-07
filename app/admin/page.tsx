"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Image as ImageIcon, Link2, FileText, Sliders, LogOut,
  Save, Loader2, Plus, Trash2, Check, AlertCircle, Eye, EyeOff, RotateCcw, Shield, KeyRound
} from 'lucide-react';

// ===================== 类型定义 =====================
type TabId = 'site' | 'appearance' | 'social' | 'content' | 'advanced' | 'security';

interface ConfigData {
  [key: string]: any;
}

// ===================== 输入组件 =====================
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
      />
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ArrayEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{label}</label>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={item}
              onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ''])}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-xs font-bold transition-colors w-fit"
        >
          <Plus size={14} /> 添加一项
        </button>
      </div>
    </div>
  );
}

// ===================== 主页面 =====================
export default function AdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigData>({});
  const [originalConfig, setOriginalConfig] = useState<ConfigData>({});
  const [activeTab, setActiveTab] = useState<TabId>('site');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 密码修改相关状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 检查登录状态
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/login');
        } else {
          loadConfig();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // 加载配置
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config/get');
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setOriginalConfig(JSON.parse(JSON.stringify(data.data)));
      }
    } catch {
      showToast('加载配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 检测变更
  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  // 更新字段
  const updateField = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateNested = (parent: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [key]: value }
    }));
  };

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      // 只发送变更的字段
      const updates: Record<string, any> = {};
      for (const key of Object.keys(config)) {
        if (JSON.stringify(config[key]) !== JSON.stringify(originalConfig[key])) {
          updates[key] = config[key];
        }
      }
      if (Object.keys(updates).length === 0) {
        showToast('没有需要保存的更改', 'error');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('配置已保存，网站正在重新构建', 'success');
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
      } else {
        showToast(data.message || '保存失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('请填写所有密码字段', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('新密码至少需要6个字符', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('密码修改成功，下次登录请使用新密码', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || '密码修改失败', 'error');
      }
    } catch {
      showToast('网络错误，请重试', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // 重置更改
  const handleReset = () => {
    setConfig(JSON.parse(JSON.stringify(originalConfig)));
    showToast('已恢复到上次保存的状态', 'success');
  };

  const menuItems: { id: TabId; name: string; icon: React.ReactNode }[] = [
    { id: 'site', name: '站点信息', icon: <Settings size={18} /> },
    { id: 'appearance', name: '外观背景', icon: <ImageIcon size={18} /> },
    { id: 'social', name: '社交链接', icon: <Link2 size={18} /> },
    { id: 'content', name: '内容设置', icon: <FileText size={18} /> },
    { id: 'advanced', name: '高级配置', icon: <Sliders size={18} /> },
    { id: 'security', name: '安全设置', icon: <Shield size={18} /> },
  ];

  // ===================== 渲染各标签页 =====================
  const renderSiteTab = () => (
    <div className="flex flex-col gap-5">
      <TextField label="网站标题" value={config.title} onChange={v => updateField('title', v)} placeholder="沐晴の编程blog" />
      <TextField label="作者名" value={config.authorName} onChange={v => updateField('authorName', v)} placeholder="沐晴" />
      <TextArea label="个人简介" value={config.bio} onChange={v => updateField('bio', v)} placeholder="一句话介绍自己" />
      <div className="grid grid-cols-3 gap-3">
        <TextField label="导航前缀" value={config.navTitle} onChange={v => updateField('navTitle', v)} placeholder="沐晴" />
        <TextField label="分隔符" value={config.navSuffix} onChange={v => updateField('navSuffix', v)} placeholder="の" />
        <TextField label="导航后缀" value={config.navAfter} onChange={v => updateField('navAfter', v)} placeholder="编程blog" />
      </div>
      <TextField label="Favicon 图标 URL" value={config.faviconUrl} onChange={v => updateField('faviconUrl', v)} placeholder="https://..." />
      <TextField label="头像 URL" value={config.avatarUrl} onChange={v => updateField('avatarUrl', v)} placeholder="https://..." />
      {config.avatarUrl && (
        <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl">
          <img src={config.avatarUrl} alt="预览" className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700" />
          <span className="text-xs text-slate-400 font-bold">头像预览</span>
        </div>
      )}
      <TextField label="建站日期" value={config.buildDate} onChange={v => updateField('buildDate', v)} placeholder="2026-03-23T00:00:00" />
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="flex flex-col gap-5">
      <ToggleField label="使用渐变背景（关闭则使用图片背景）" value={config.useGradient} onChange={v => updateField('useGradient', v)} />
      {config.useGradient && (
        <ArrayEditor label="渐变颜色列表" items={config.themeColors || []} onChange={items => updateField('themeColors', items)} placeholder="#a18cd1" />
      )}
      {!config.useGradient && (
        <ArrayEditor label="背景图片路径列表" items={config.bgImages || []} onChange={items => updateField('bgImages', items)} placeholder="/background/xxx.jpg" />
      )}
      <TextField label="文章默认封面图" value={config.defaultPostCover} onChange={v => updateField('defaultPostCover', v)} placeholder="https://..." />
      <TextField label="首页照片墙预览图" value={config.photoWallImage} onChange={v => updateField('photoWallImage', v)} placeholder="https://..." />
    </div>
  );

  const renderSocialTab = () => {
    const social = config.social || {};
    return (
      <div className="flex flex-col gap-5">
        <TextField label="GitHub" value={social.github} onChange={v => updateNested('social', 'github', v)} placeholder="https://github.com/..." />
        <TextField label="Gitee" value={social.gitee} onChange={v => updateNested('social', 'gitee', v)} placeholder="https://gitee.com/..." />
        <TextField label="Google" value={social.google} onChange={v => updateNested('social', 'google', v)} placeholder="无" />
        <TextField label="邮箱" value={social.email} onChange={v => updateNested('social', 'email', v)} placeholder="xxx@qq.com" />
        <TextField label="QQ" value={social.qq} onChange={v => updateNested('social', 'qq', v)} placeholder="QQ号" />
        <TextField label="微信" value={social.wechat} onChange={v => updateNested('social', 'wechat', v)} placeholder="微信号" />
      </div>
    );
  };

  const renderContentTab = () => (
    <div className="flex flex-col gap-5">
      <TextField label="杂谈板块标题" value={config.chatterTitle} onChange={v => updateField('chatterTitle', v)} placeholder="云端杂谈" />
      <TextArea label="杂谈板块描述" value={config.chatterDescription} onChange={v => updateField('chatterDescription', v)} placeholder="板块的一句话描述" />
      <ArrayEditor label="网易云音乐 ID 列表" items={config.cloudMusicIds || []} onChange={items => updateField('cloudMusicIds', items)} placeholder="1809646618" />
      <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
      <TextField label="图床名称" value={config.picBedName} onChange={v => updateField('picBedName', v)} placeholder="图床" />
      <TextField label="图床 API 地址" value={config.picBedUrl} onChange={v => updateField('picBedUrl', v)} placeholder="https://..." />
      <TextField label="图床 Token" value={config.picBedToken} onChange={v => updateField('picBedToken', v)} placeholder="Lsky Pro Token" />
    </div>
  );

  const renderAdvancedTab = () => {
    const icp = config.icpConfig || {};
    const gemini = config.geminiConfig || {};
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">ICP 备案配置</span>
          <TextField label="备案号" value={icp.name} onChange={v => updateNested('icpConfig', 'name', v)} placeholder="蜀ICP备xxxxx号" />
          <TextField label="备案链接" value={icp.link} onChange={v => updateNested('icpConfig', 'link', v)} placeholder="https://beian.miit.gov.cn/" />
        </div>
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
        <ArrayEditor label="背景弹幕列表" items={config.danmakuList || []} onChange={items => updateField('danmakuList', items)} placeholder="在干嘛呢？" />
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
        <ToggleField label="启用等级系统" value={config.enableLevelSystem} onChange={v => updateField('enableLevelSystem', v)} />
        <TextField label="照片墙数量" value={String(config.counts?.photos || '')} onChange={v => updateNested('counts', 'photos', parseInt(v) || 0)} placeholder="128" />
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
        <div className="flex flex-col gap-3">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Gemini AI 配置</span>
          <TextField label="模型 ID" value={gemini.modelId} onChange={v => updateNested('geminiConfig', 'modelId', v)} placeholder="gemini-2.5-flash-lite" />
          <TextArea label="系统提示词" value={gemini.systemPrompt} onChange={v => updateNested('geminiConfig', 'systemPrompt', v)} placeholder="AI 角色设定..." />
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => (
    <div className="flex flex-col gap-5">
      {/* 密码修改区域 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="text-indigo-500" size={20} />
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">修改管理员密码</span>
        </div>

        {/* 旧密码 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">旧密码</label>
          <div className="relative">
            <input
              type={showOldPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
              className="w-full px-4 py-2.5 pr-12 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
            >
              {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* 新密码 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">新密码</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少6个字符"
              className="w-full px-4 py-2.5 pr-12 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPassword && newPassword.length < 6 && (
            <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
              <AlertCircle size={12} /> 密码至少需要6个字符
            </span>
          )}
        </div>

        {/* 确认新密码 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">确认新密码</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="w-full px-4 py-2.5 pr-12 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <span className="text-xs text-red-500 font-bold flex items-center gap-1">
              <AlertCircle size={12} /> 两次输入的密码不一致
            </span>
          )}
          {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
            <span className="text-xs text-green-500 font-bold flex items-center gap-1">
              <Check size={12} /> 密码匹配
            </span>
          )}
        </div>

        {/* 修改密码按钮 */}
        <button
          onClick={handleChangePassword}
          disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
          className="flex items-center justify-center gap-2 px-5 py-3 mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
        >
          {changingPassword ? <><Loader2 size={16} className="animate-spin" /> 修改中...</> : <><KeyRound size={16} /> 确认修改密码</>}
        </button>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

      {/* 安全提示 */}
      <div className="flex flex-col gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex items-center gap-2">
          <Shield className="text-amber-500" size={16} />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">安全提示</span>
        </div>
        <ul className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium list-disc list-inside gap-1 flex flex-col">
          <li>密码修改后立即生效，下次登录需使用新密码</li>
          <li>当前已登录的会话不会受影响（7天后过期）</li>
          <li>建议使用包含字母、数字和特殊字符的强密码</li>
          <li>请妥善保管密码，丢失后需通过服务器环境变量重置</li>
        </ul>
      </div>
    </div>
  );

  const tabContent: Record<TabId, React.ReactNode> = {
    site: renderSiteTab(),
    appearance: renderAppearanceTab(),
    social: renderSocialTab(),
    content: renderContentTab(),
    advanced: renderAdvancedTab(),
    security: renderSecurityTab(),
  };

  // ===================== 加载状态 =====================
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold tracking-widest text-sm uppercase">加载配置中...</p>
        </div>
      </div>
    );
  }

  // ===================== 主界面 =====================
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50 flex">
      {/* 左侧导航栏 */}
      <div className="w-72 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col p-5 gap-4">
        {/* Logo 区 */}
        <div className="flex flex-col items-center gap-2 pb-5 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white">全站编辑器</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Site Editor</p>
        </div>

        {/* 菜单项 */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm
                ${activeTab === item.id
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 translate-x-1'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:translate-x-0.5'
                }`}
            >
              {item.icon}
              {item.name}
            </button>
          ))}
        </nav>

        {/* 底部按钮 */}
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-indigo-500 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors"
          >
            <Eye size={16} /> 预览网站
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors"
          >
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部操作栏 */}
        <div className="h-16 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-8">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {menuItems.find(m => m.id === activeTab)?.name}
          </h2>
          {/* 安全设置页不显示保存按钮 */}
          {activeTab !== 'security' && (
            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <AlertCircle size={14} /> 有未保存的更改
                </span>
              )}
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  <RotateCcw size={14} /> 撤销
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> 保存中...</> : <><Save size={16} /> 保存配置</>}
              </button>
            </div>
          )}
        </div>

        {/* 表单内容区 */}
        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 p-8 shadow-lg"
          >
            {tabContent[activeTab]}
          </motion.div>
        </div>
      </div>

      {/* Toast 提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border font-bold text-sm
              ${toast.type === 'success'
                ? 'bg-green-500/90 text-white border-green-400/30'
                : 'bg-red-500/90 text-white border-red-400/30'
              }`}
            >
              {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
