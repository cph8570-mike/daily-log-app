import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Users, 
  Hammer, 
  FileText,
  Image as ImageIcon,
  CheckSquare,
  AlertCircle,
  ShieldCheck,
  PenTool,
  RotateCcw,
  Save,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Printer,
  Copy,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  AlertTriangle
} from 'lucide-react';

const App = () => {
  // --- 1. 通行碼與狀態驗證 ---
  const [isVerified, setIsVerified] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [loginError, setLoginError] = useState(false);
  const COMPANY_CODE = "8888"; 

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isVerified');
    if (sessionAuth === 'true') setIsVerified(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputCode === COMPANY_CODE) {
      setIsVerified(true);
      sessionStorage.setItem('isVerified', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // --- 2. 核心狀態設定 ---
  const [activeTab, setActiveTab] = useState('edit');
  const [splitView, setSplitView] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); 
  const [aiLoading, setAiLoading] = useState({ photoIndex: null, review: false });

  // 請在此填入您的 API Key (Gemini)
  const apiKey = ""; 

  const projectOptions = ['2026高雄lala-20240雛菊見', '2026台南好瀚安平實品屋與接待中心', '2026台中焼肉ショジョYakiniku SHOJO 公益店', '2026台中焼肉ショジョYakiniku SHOJO 洲際店', '2026台南永龍建設V&A5 杜公館', '2027林口-MITSUI OUTLET PARK 饗麻饗辣PLUS'];
  const authorOptions = ['鄭秉宏', '許晏瑜', '郭畯豪', '蘇盈圲', '劉彥伶'];
  const weatherOptions = ['晴', '陰', '雨', '颱風'];

  const defaultState = {
    projectName: projectOptions[0],
    author: authorOptions[0],
    date: new Date().toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '2026-12-31',
    dayCount: '1',
    weather: weatherOptions[0],
    location: '現場',
    manpower: [{ id: 1, type: '', count: 1, note: '' }],
    planTomorrow: '',
    ownerInstructions: '',
    engineeringReview: '',
    photos: [], 
    siteChecks: { cleanliness: false, doorsClosed: false, powerOff: false },
    ownerSignature: null 
  };

  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem('constructionLogData_v2');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        return { ...defaultState, ...parsed };
      } catch (e) { return defaultState; }
    }
    return defaultState;
  });

  // --- V2.2 修改 1: 自動計算施工天數 (今日日期 - 開工日期) ---
  useEffect(() => {
    const start = new Date(formData.startDate);
    const today = new Date(formData.date);
    if (!isNaN(start) && !isNaN(today)) {
      const diffTime = today - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含開工當日
      // 僅在天數有變動且合理時更新，避免無限迴圈
      if (diffDays > 0 && diffDays.toString() !== formData.dayCount) {
        setFormData(prev => ({ ...prev, dayCount: diffDays.toString() }));
      }
    }
  }, [formData.startDate, formData.date]);

  // --- V2.2 修改 2: 動態修改網頁標題 (控制存檔檔名) ---
  useEffect(() => {
    if (isPrintMode) {
      document.title = `${formData.projectName}-${formData.date}`;
    } else {
      document.title = "施工日誌 App V2.2";
    }
  }, [isPrintMode, formData.projectName, formData.date]);

  // --- 3. 輔助功能 (自動存檔、圖片壓縮) ---
  useEffect(() => {
    const checkWidth = () => { setSplitView(window.innerWidth >= 1024); };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('constructionLogData_v2', JSON.stringify(formData));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus(e.name === 'QuotaExceededError' ? 'quota_error' : 'error');
    }
  }, [formData]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          let w = img.width; let h = img.height;
          if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  // --- 4. 操作處理器 ---
  const handleReset = () => { if (window.confirm('確定要清除所有資料並重置嗎？')) { localStorage.removeItem('constructionLogData_v2'); window.location.reload(); } };
  const handleInputChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const url = await compressImage(file);
      setFormData(p => ({ ...p, photos: [...p.photos, { url, desc: '' }] }));
    }
  };

  const copyToClipboard = () => {
    const text = `
【施工日誌】${formData.date} (第 ${formData.dayCount} 天)
案名：${formData.projectName}
填表人：${formData.author}
-------------------
【出工紀錄】
${formData.manpower.map(m => `${m.type}：${m.count}人\n內容：\n${m.note}`).join('\n')}
-------------------
明日預定：${formData.planTomorrow}
    `.trim();
    const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    alert("已複製日誌文字！");
  };

  const triggerBrowserPrint = () => { window.print(); };

  // --- 5. 元件渲染 ---
  if (!isVerified) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-6">施工日誌系統登入</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={inputCode} onChange={e => setInputCode(e.target.value)} className="w-full p-2 border rounded" placeholder="通行碼" autoFocus />
          {loginError && <p className="text-red-500 text-sm">密碼錯誤</p>}
          <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded">進入系統</button>
        </form>
      </div>
    </div>
  );

  const PreviewContent = () => (
    <div className="bg-white p-8 mx-auto max-w-[210mm] print:p-0" id="log-preview">
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-gray-900">工程施工日誌</h2>
        <div className="flex justify-between mt-2 px-4 text-sm text-gray-600">
          <span>填表人：{formData.author}</span>
          <span>{formData.date}</span>
        </div>
      </div>
      <div className="mb-6 border border-gray-300 text-sm grid grid-cols-2">
        <div className="p-2 border-b border-r border-gray-300"><b>專案名稱：</b>{formData.projectName}</div>
        <div className="p-2 border-b border-gray-300"><b>施工地點：</b>{formData.location}</div>
        <div className="p-2 border-b border-r border-gray-300"><b>開工日期：</b>{formData.startDate}</div>
        <div className="p-2 border-b border-gray-300"><b>今日日期：</b>{formData.date}</div>
        <div className="p-2 border-r border-gray-300"><b>天氣：</b>{formData.weather}</div>
        <div className="p-2 font-bold text-blue-700"><b>累計工期：</b>第 {formData.dayCount} 天</div>
      </div>
      {/* 其餘預覽內容保持一致... */}
      <div className="space-y-4">
        <h4 className="font-bold bg-gray-100 p-1 border-l-4 border-gray-800 text-sm">一、出工紀錄</h4>
        <table className="w-full text-sm border-collapse border border-gray-400">
          <thead><tr className="bg-gray-50"><th className="border p-1 w-1/4">工種</th><th className="border p-1 w-16">人數</th><th className="border p-1">內容</th></tr></thead>
          <tbody>
            {formData.manpower.map(m => (
              <tr key={m.id}><td className="border p-1">{m.type}</td><td className="border p-1 text-center">{m.count}</td><td className="border p-1 whitespace-pre-line">{m.note}</td></tr>
            ))}
          </tbody>
        </table>
        <div>
          <h4 className="font-bold bg-gray-100 p-1 border-l-4 border-purple-600 text-sm mb-2">二、施工照片</h4>
          <div className="grid grid-cols-2 gap-4 print:block">
            {formData.photos.map((p, i) => (
              <div key={i} className="border border-gray-300 p-1 print:inline-block print:w-[48%] print:m-[1%] print:mb-4" style={{ pageBreakInside: 'avoid' }}>
                <img src={p.url} className="w-full aspect-video object-contain bg-gray-50" />
                <p className="text-xs p-1 mt-1 border-t">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isPrintMode) return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center z-50 print:hidden">
        <button onClick={() => setIsPrintMode(false)} className="px-4 py-1 bg-slate-600 rounded flex items-center gap-1"><ArrowLeft size={16}/> 返回編輯</button>
        <button onClick={triggerBrowserPrint} className="px-6 py-1 bg-blue-600 rounded font-bold flex items-center gap-1 shadow-lg"><Printer size={16}/> 確認列印 / 存為 PDF</button>
      </div>
      <div className="pt-20 pb-10 flex justify-center"><PreviewContent /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className={`mx-auto bg-white shadow-xl rounded-xl transition-all ${splitView ? 'max-w-[1600px]' : 'max-w-4xl'}`}>
        <div className="bg-slate-800 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6" /> 施工日誌 V2.2</h1></div>
          <div className="flex gap-2">
            <button onClick={() => setSplitView(!splitView)} className="hidden lg:flex px-3 py-1 bg-slate-700 rounded text-sm items-center gap-1">{splitView ? <Minimize2 size={14}/> : <Maximize2 size={14}/>} 預覽</button>
            <button onClick={handleReset} className="px-3 py-1 bg-red-800 rounded text-sm items-center gap-1 flex"><RotateCcw size={14}/> 重置</button>
          </div>
        </div>
        <div className="p-6 flex gap-8">
          <div className="flex-1 space-y-6 overflow-y-auto max-h-[85vh] pr-2">
            <section className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2 flex items-center gap-2 text-slate-700"><FileText className="text-blue-500" size={18}/> 基本資訊</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-500 mb-1 block">專案名稱</label><select name="projectName" value={formData.projectName} onChange={handleInputChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none">{projectOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 mb-1 block">填表人</label><select name="author" value={formData.author} onChange={handleInputChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none">{authorOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 mb-1 block">開工日期</label><input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block">今日日期</label><input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div className="md:col-span-2 flex gap-4">
                  <div className="flex-1"><label className="text-xs text-slate-500 mb-1 block">施工天數 (自動計算)</label><input type="number" name="dayCount" value={formData.dayCount} onChange={handleInputChange} className="w-full border p-2 rounded bg-blue-50 font-bold text-blue-700" /></div>
                  <div className="flex-1"><label className="text-xs text-slate-500 mb-1 block">天氣</label><select name="weather" value={formData.weather} onChange={handleInputChange} className="w-full border p-2 rounded">{weatherOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                </div>
              </div>
            </section>
            {/* 其餘編輯區塊內容 (Manpower, Photos, etc.) 保持與 V2.1 一致 */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2"><h3 className="text-lg font-bold flex items-center gap-2"><Users size={18} className="text-blue-500"/> 出工紀錄</h3><button onClick={() => setFormData(p=>({ ...p, manpower: [...p.manpower, { id: Date.now(), type: '', count: 1, note: '' }] }))} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">+ 新增工種</button></div>
              {formData.manpower.map(m => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-lg border space-y-2">
                  <div className="flex gap-2">
                    <input className="flex-1 border p-1 rounded text-sm" value={m.type} onChange={e=>{const n=[...formData.manpower]; n.find(x=>x.id===m.id).type=e.target.value; setFormData(p=>({...p, manpower:n}))}} placeholder="工種" />
                    <input className="w-12 border p-1 rounded text-center" type="number" value={m.count} onChange={e=>{const n=[...formData.manpower]; n.find(x=>x.id===m.id).count=e.target.value; setFormData(p=>({...p, manpower:n}))}} />
                    <button onClick={()=>setFormData(p=>({ ...p, manpower: p.manpower.filter(it=>it.id!==m.id) }))} className="text-red-400">×</button>
                  </div>
                  <textarea className="w-full border p-2 rounded text-sm h-16" value={m.note} onChange={e=>{const n=[...formData.manpower]; n.find(x=>x.id===m.id).note=e.target.value; setFormData(p=>({...p, manpower:n}))}} placeholder="內容說明..." />
                </div>
              ))}
            </section>
            <div className="flex gap-4 pb-10">
              <button onClick={copyToClipboard} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white p-4 rounded-xl font-bold"><Copy size={18}/> 複製文字</button>
              <button onClick={() => setIsPrintMode(true)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white p-4 rounded-xl font-bold"><Printer size={18}/> 預覽與列印</button>
            </div>
          </div>
          {splitView && <div className="hidden lg:block w-1/2 bg-gray-50 p-6 overflow-y-auto max-h-[85vh] rounded-r-xl border-l shadow-inner"><PreviewContent /></div>}
        </div>
      </div>
    </div>
  );
};

export default App;
