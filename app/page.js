'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Folder, Plus, BookOpen, Brain, RefreshCw, X, Link as LinkIcon } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [relations, setRelations] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  
  // Form state
  const [newWord, setNewWord] = useState('');
  const [newWeight, setNewWeight] = useState(3);
  const [newSummary, setNewSummary] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');

  // Mode test
  const [isTestMode, setIsTestMode] = useState(false);
  const [testPair, setTestPair] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (currentFolder) {
      fetchKeywords(currentFolder.id);
      fetchRelations();
    }
  }, [currentFolder]);

  async function fetchFolders() {
    const { data } = await supabase.from('folders').select('*').order('created_at');
    if (data && data.length > 0) {
      setFolders(data);
      if (!currentFolder) setCurrentFolder(data[0]);
    }
  }

  async function addFolder() {
    if (!newFolderInput.trim()) return;
    const { data } = await supabase.from('folders').insert([{ name: newFolderInput }]).select();
    if (data) {
      setFolders([...folders, data[0]]);
      setCurrentFolder(data[0]);
      setNewFolderInput('');
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
    if (relations.length === 0) {
      alert("Cần tạo ít nhất 1 liên kết giữa hai từ trước khi kiểm tra!");
      return;
    }
    const randomRel = relations[Math.floor(Math.random() * relations.length)];
    const source = keywords.find(k => k.id === randomRel.source_id);
    const target = keywords.find(k => k.id === randomRel.target_id);
    setTestPair({ source, target, rel: randomRel });
    setShowAnswer(false);
    setIsTestMode(true);
  }

  // Phông chữ theo trọng số (Word Cloud Styling)
  const sizeClasses = {
    1: 'text-sm font-normal text-slate-500',
    2: 'text-base font-medium text-slate-600',
    3: 'text-xl font-semibold text-indigo-600',
    4: 'text-2xl font-bold text-violet-700',
    5: 'text-4xl font-extrabold text-blue-800 tracking-wide',
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-lg text-indigo-600">
          <Brain className="w-6 h-6" /> RecallCloud
        </div>
        <div className="p-3">
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
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Chủ đề của bạn</p>
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { setCurrentFolder(f); setSelectedWord(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  currentFolder?.id === f.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Folder className="w-4 h-4" /> {f.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            {currentFolder ? currentFolder.name : "Chọn một môn học"}
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
              <p className="text-slate-400 text-sm">Chưa có từ khóa nào. Hãy nhập vào ô bên phải để hiển thị!</p>
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

      {/* 3. INSPECTOR / DETAILS PANEL */}
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
                <span className="text-xs font-bold text-slate-400 uppercase">Mô tả / Bản chất</span>
                <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-3 rounded-lg border leading-relaxed">
                  {selectedWord.summary || "Chưa có ghi chú mô tả cho từ này."}
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
                <label className="text-xs font-bold text-slate-500 block mb-1">Ghi chú / Định nghĩa ngắn</label>
                <textarea
                  rows="3"
                  placeholder="Nhập gợi nhớ bản chất của khái niệm này..."
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition"
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
                <Brain className="w-5 h-5 text-indigo-600" /> Thử thách Gợi nhớ Liên kết
              </span>
              <button onClick={() => setIsTestMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Mối liên hệ giữa 2 khái niệm này là gì?</p>
              <div className="flex items-center justify-center gap-4 text-xl font-bold">
                <span className="text-indigo-600">{testPair.source?.text}</span>
                <LinkIcon className="w-5 h-5 text-slate-400" />
                <span className="text-violet-600">{testPair.target?.text}</span>
              </div>
            </div>

            {showAnswer ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Ghi chú liên kết:</span>
                <p className="text-sm text-slate-700">{testPair.rel.relationship_label || "Chưa có mô tả chi tiết."}</p>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition"
              >
                Xem đáp án đã lưu
              </button>
            )}

            <button
              onClick={() => setIsTestMode(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              Hoàn thành ôn tập
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
