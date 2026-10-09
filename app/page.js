'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Folder, Plus, BookOpen, Brain, RefreshCw, X, Link as LinkIcon, Share2, LogOut, Lock } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [session, setSession] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [relations, setRelations] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);

  // Form states
  const [newWord, setNewWord] = useState('');
  const [newWeight, setNewWeight] = useState(3);
  const [newSummary, setNewSummary] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');

  // Mode test
  const [isTestMode, setIsTestMode] = useState(false);
  const [testPair, setTestPair] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchFolders();
    }
  }, [session]);

  useEffect(() => {
    if (currentFolder) {
      fetchKeywords(currentFolder.id);
      fetchRelations();
    }
  }, [currentFolder]);

  // Auth: Đăng nhập bằng link gửi qua Email (Magic Link - không cần nhớ mật khẩu)
  async function handleLogin(e) {
    e.preventDefault();
    setAuthMsg('Đang gửi link xác thực...');
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) setAuthMsg(error.message);
    else setAuthMsg('Đã gửi link đăng nhập vào email của bạn! Hãy mở mail để đăng nhập.');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setFolders([]);
    setKeywords([]);
    setCurrentFolder(null);
  }

  async function fetchFolders() {
    const { data } = await supabase.from('folders').select('*').order('created_at');
    if (data && data.length > 0) {
      setFolders(data);
      if (!currentFolder) setCurrentFolder(data[0]);
    }
  }

  async function addFolder() {
    if (!newFolderInput.trim() || !session) return;
    const { data } = await supabase.from('folders').insert([{
      name: newFolderInput,
      user_id: session.user.id
    }]).select();
    if (data) {
      setFolders([...folders, data[0]]);
      setCurrentFolder(data[0]);
      setNewFolderInput('');
    }
  }

  async function toggleShareFolder() {
    if (!currentFolder) return;
    const updatedStatus = !currentFolder.is_public;
    const { error } = await supabase.from('folders').update({ is_public: updatedStatus }).eq('id', currentFolder.id);
    if (!error) {
      setCurrentFolder({ ...currentFolder, is_public: updatedStatus });
      setFolders(folders.map(f => f.id === currentFolder.id ? { ...f, is_public: updatedStatus } : f));
      if (updatedStatus) {
        navigator.clipboard.writeText(`${window.location.origin}?share=${currentFolder.id}`);
        alert('Đã bật chia sẻ và copy link vào bộ nhớ tạm!');
      } else {
        alert('Đã tắt chia sẻ công khai.');
      }
    }
  }

  async function fetchKeywords(folderId) {
    const { data } = await supabase.from('keywords').select('*').eq('folder_id', folderId);
    if (data) setKeywords(data);
  }

  async function fetchRelations() {
    const { data } = await supabase.from('keyword_relations').select('*');
    if (data) setRelations(data);
  }

  async function addKeyword(e) {
    e.preventDefault();
    if (!newWord.trim() || !currentFolder) return;
    const { data } = await supabase.from('keywords').insert([{
      folder_id: currentFolder.id,
      text: newWord,
      weight: Number(newWeight),
      summary: newSummary,
    }]).select();

    if (data) {
      setKeywords([...keywords, data[0]]);
      setNewWord('');
      setNewSummary('');
    }
  }

  function startRecallTest() {
    if (keywords.length < 2) {
      alert("Cần có ít nhất 2 từ khóa trong chủ đề để ôn tập!");
      return;
    }
    // Bốc ngẫu nhiên 2 từ bất kỳ để kích thích tư duy liên kết
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    setTestPair({ source: shuffled[0], target: shuffled[1] });
    setShowAnswer(false);
    setIsTestMode(true);
  }

  const sizeClasses = {
    1: 'text-sm font-normal text-slate-500',
    2: 'text-base font-medium text-slate-600',
    3: 'text-xl font-semibold text-indigo-600',
    4: 'text-2xl font-bold text-violet-700',
    5: 'text-4xl font-extrabold text-blue-800 tracking-wide',
  };

  // MÀN HÌNH ĐĂNG NHẬP
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Brain className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Kho Tri Thức Cá Nhân</h2>
            <p className="text-sm text-slate-500">Nhập email để nhận link truy cập kho từ khóa của bạn</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              required
              placeholder="tenban@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition"
            >
              Nhận link đăng nhập
            </button>
          </form>

          {authMsg && (
            <p className="text-xs text-center text-slate-600 bg-slate-50 p-3 rounded-lg border">{authMsg}</p>
          )}
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH KHI ĐÃ ĐĂNG NHẬP
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg text-indigo-600 mb-4">
            <Brain className="w-6 h-6" /> RecallCloud
          </div>
          <div className="flex gap-1 mb-4">
            <input
              type="text"
              placeholder="Thêm môn học..."
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              className="w-full text-sm px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button onClick={addFolder} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Kho môn học</p>
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { setCurrentFolder(f); setSelectedWord(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  currentFolder?.id === f.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Folder className="w-4 h-4 shrink-0" /> {f.name}
                </span>
                {f.is_public && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Share</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Footer User Profile */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 truncate max-w-[140px]">{session.user.email}</span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 p-1" title="Đăng xuất">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            {currentFolder ? currentFolder.name : "Chọn một môn học"}
            {currentFolder && (
              <button
                onClick={toggleShareFolder}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-normal transition ${
                  currentFolder.is_public ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                {currentFolder.is_public ? 'Đang chia sẻ (Bấm để tắt)' : 'Chia sẻ kho này'}
              </button>
            )}
          </div>
          <button
            onClick={startRecallTest}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Bắt đầu Ôn tập Liên kết
          </button>
        </header>

        {/* Word Cloud View */}
        <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
          <div className="max-w-4xl w-full flex flex-wrap gap-4 items-center justify-center p-8 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
            {keywords.length === 0 ? (
              <p className="text-slate-400 text-sm">Chưa có từ khóa nào. Hãy thêm từ khóa ở cột bên phải!</p>
            ) : (
              keywords.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => setSelectedWord(kw)}
                  className={`${sizeClasses[kw.weight]} transition-transform duration-200 hover:scale-110 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-indigo-50`}
                >
                  {kw.text}
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 3. INSPECTOR PANEL */}
      <aside className="w-80 bg-white border-l border-slate-200 p-5 flex flex-col justify-between overflow-y-auto">
        <div>
          <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b">
            {selectedWord ? "Chi tiết Khái niệm" : "Thêm Từ khóa Mới"}
          </h3>

          {selectedWord ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Từ khóa</span>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{selectedWord.text}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Ghi chú / Bản chất</span>
                <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-3 rounded-lg border leading-relaxed">
                  {selectedWord.summary || "Chưa có mô tả cho từ khóa này."}
                </p>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="w-full py-1.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 mt-2"
              >
                Đóng chi tiết
              </button>
            </div>
          ) : (
            <form onSubmit={addKeyword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tên từ khóa</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Polymorphism, Cung cầu..."
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Trọng số kích thước (1 đến 5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Nhỏ (Phụ)</span>
                  <span>Lớn (Cốt lõi)</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Ghi chú / Định nghĩa tóm tắt</label>
                <textarea
                  rows="3"
                  placeholder="Nhập ghi chú gợi nhớ..."
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={!currentFolder}
                className="w-full py-2 bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition"
              >
                Thêm vào Word Cloud
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* MODAL: CHẾ ĐỘ KIỂM TRA LIÊN KẾT */}
      {isTestMode && testPair && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" /> Thử thách Gợi nhớ Chủ động
              </span>
              <button onClick={() => setIsTestMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Hãy giải thích: Hai khái niệm này liên quan đến nhau như thế nào trong môn học?
              </p>
              <div className="flex items-center justify-center gap-4 text-xl font-bold my-4">
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">{testPair.source?.text}</span>
                <LinkIcon className="w-5 h-5 text-slate-400" />
                <span className="text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg">{testPair.target?.text}</span>
              </div>
            </div>

            {showAnswer ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <span className="font-bold text-indigo-700">[{testPair.source?.text}]: </span>
                  <span className="text-slate-600">{testPair.source?.summary || "Không có ghi chú"}</span>
                </div>
                <div>
                  <span className="font-bold text-violet-700">[{testPair.target?.text}]: </span>
                  <span className="text-slate-600">{testPair.target?.summary || "Không có ghi chú"}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition"
              >
                Hiển thị ghi chú của 2 từ
              </button>
            )}

            <button
              onClick={() => setIsTestMode(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              Xong thử thách
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
