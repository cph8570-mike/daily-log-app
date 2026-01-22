import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Users, 
  Hammer, 
  FileText,
  Image as ImageIcon,
  User,
  CheckSquare,
  AlertCircle,
  ShieldCheck,
  PenTool,
  RotateCcw,
  Save,
  Sparkles,
  Loader2,
  Layout,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Printer,
  Copy,
  Download,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  KeyRound
} from 'lucide-react';

const App = () => {
  // --- 1. 公司通行碼驗證 ---
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

  // --- 2. 應用程式主要狀態 ---
  const [activeTab, setActiveTab] = useState('edit');
  const [splitView, setSplitView] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); 
  
  const [aiLoading, setAiLoading] = useState({ photoIndex: null, review: false });

  // 請在此填入您的 API Key
  const apiKey = ""; 

  const projectOptions = ['高雄lala-20240雛菊見-2026-NO.1', '台南好瀚安平實品屋與接待中心-2026-NO.02', '客變-台中遠雄琉蘊A02-23F-賀小姐', '客變-台中遠雄琉蘊A07-23F-彭小姐', '商-[焼肉ショジョYakiniku SHOJO]-2026-NO.4', '台中洪公館修改案-2026-NO.5'];
  const authorOptions = ['鄭秉宏', '許晏瑜', '郭畯豪', '蘇盈圲', '劉彥伶'];
  const weatherOptions = ['晴', '陰', '雨', '颱風'];

  const defaultState = {
    projectName: projectOptions[0],
    author: authorOptions[0],
    date: new Date().toISOString().slice(0, 10),
    startDate: '2023-10-01',
    endDate: '2023-12-31',
    dayCount: '15',
    weather: weatherOptions[0],
    location: '客廳/主臥',
    manpower: [
      { id: 1, type: '木工', count: 2, note: '1. 天花板封板\n2. 窗簾盒製作' },
      { id: 2, type: '水電', count: 1, note: '新增插座拉線' }
    ],
    planTomorrow: '1. 客廳天花板封板\n2. 油漆進場批土\n3. 清運廢料',
    ownerInstructions: '1. 主臥窗簾盒深度確認需達 25cm\n2. 玄關燈具要改用 4000K 色溫',
    engineeringReview: '1. 廚房排水管路徑與系統櫃圖面有衝突，需盡快確認\n2. 現場垃圾堆積稍多，明日安排清運',
    photos: [], 
    siteChecks: { cleanliness: false, doorsClosed: false, powerOff: false },
    ownerSignature: null 
  };

  const getInitialState = () => {
    const savedData = localStorage.getItem('constructionLogData_v2');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (!parsedData.ownerSignature) parsedData.ownerSignature = null;
        return { ...defaultState, ...parsedData };
      } catch (e) { return defaultState; }
    }
    return defaultState;
  };

  const [formData, setFormData] = useState(getInitialState);

  // RWD & AutoSave
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

  // Image Compression
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
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  // Gemini API
  const callGeminiAPI = async (payload) => {
    if (!apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return await response.json();
  };

  const handleAiPolishReview = async () => {
    if (!formData.engineeringReview) return;
    setAiLoading(p => ({ ...p, review: true }));
    try {
      const prompt = `請將以下工程檢討事項改寫得更加專業、語氣客觀且清晰：${formData.engineeringReview}`;
      const result = await callGeminiAPI({ contents: [{ parts: [{ text: prompt }] }] });
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setFormData(p => ({ ...p, engineeringReview: text.trim() }));
    } catch (e) { alert("AI 功能需設定 API Key"); }
    finally { setAiLoading(p => ({ ...p, review: false })); }
  };

  const handleAiPhotoDesc = async (index) => {
    const photo = formData.photos[index];
    if (!photo) return;
    setAiLoading(p => ({ ...p, photoIndex: index }));
    try {
      const base64Data = photo.url.split(',')[1];
      const payload = { contents: [{ parts: [{ text: "請用繁體中文簡潔描述這張施工照片內容" }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }] };
      const result = await callGeminiAPI(payload);
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const newPhotos = [...formData.photos];
        newPhotos[index].desc = text.trim();
        setFormData(p => ({ ...p, photos: newPhotos }));
      }
    } catch (e) { alert("AI 功能需設定 API Key"); }
    finally { setAiLoading(p => ({ ...p, photoIndex: null })); }
  };

  // Form Handlers
  const handleReset = () => {
    if (window.confirm('確定要清除所有資料並重置嗎？')) {
      localStorage.removeItem('constructionLogData_v2');
      window.location.reload();
    }
  };
  const handleInputChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleManpowerChange = (id, f, v) => setFormData(p => ({ ...p, manpower: p.manpower.map(m => m.id === id ? { ...m, [f]: v } : m) }));
  const addManpowerRow = () => setFormData(p => ({ ...p, manpower: [...p.manpower, { id: Date.now(), type: '', count: 1, note: '' }] }));
  const removeManpowerRow = (id) => setFormData(p => ({ ...p, manpower: p.manpower.filter(m => m.id !== id) }));
  
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const url = await compressImage(file);
      setFormData(p => ({ ...p, photos: [...p.photos, { url, desc: '' }] }));
    }
  };
  const handlePhotoDescChange = (i, v) => {
    const newPhotos = [...formData.photos];
    newPhotos[i].desc = v;
    setFormData(p => ({ ...p, photos: newPhotos }));
  };
  const removePhoto = (i) => setFormData(p => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }));
  
  const toggleCheck = (f) => setFormData(p => ({ ...p, siteChecks: { ...p.siteChecks, [f]: !p.siteChecks[f] } }));

  // Canvas
  const startDrawing = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
    if(e.type === 'touchmove') e.preventDefault();
  };
  const stopDrawing = () => { 
    if (isDrawing) { setIsDrawing(false); saveSignature(); } 
  };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      setFormData(p => ({ ...p, ownerSignature: null }));
    }
  };
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) setFormData(p => ({ ...p, ownerSignature: canvas.toDataURL() }));
  };

  const copyToClipboard = () => {
    const text = `
【施工日誌】${formData.date} (第 ${formData.dayCount} 天)
案名：${formData.projectName}
填表人：${formData.author}
天氣：${formData.weather}
-------------------
【出工人數】
${formData.manpower.map(m => `${m.type}：${m.count}人\n內容：\n${m.note}`).join('\n')}
共計：${formData.manpower.reduce((sum, item) => sum + Number(item.count), 0)} 人
-------------------
【明日預定】
${formData.planTomorrow}
-------------------
【業主交辦事項】
${formData.ownerInstructions || '無'}
-------------------
【工程檢討 (重要)】
${formData.engineeringReview || '無'}
-------------------
【離場檢查】
工地整潔：${formData.siteChecks.cleanliness ? '已確認' : '未確認'}
門窗關閉：${formData.siteChecks.doorsClosed ? '已確認' : '未確認'}
總電源關閉：${formData.siteChecks.powerOff ? '已確認' : '未確認'}
-------------------
※ 現場照片請見附檔
    `.trim();

    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert("已複製完整日誌文字！");
  };

  const triggerBrowserPrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { margin: 0; size: auto; }
        body, html { height: auto !important; overflow: visible !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
  };

  if (!isVerified) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mb-3"><Lock className="w-8 h-8 text-blue-600" /></div>
          <h2 className="text-xl font-bold text-gray-800">請輸入公司通行碼</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input type="password" value={inputCode} onChange={e => setInputCode(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" placeholder="密碼" autoFocus />
          </div>
          {loginError && <div className="text-red-500 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> 密碼錯誤</div>}
          <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg">進入系統</button>
        </form>
      </div>
    </div>
  );

  const PreviewContent = () => (
    <div className="bg-white border border-gray-300 p-8 shadow-sm print:border-none print:shadow-none print:p-0 mx-auto max-w-[210mm] print:w-full print:max-w-none" id="log-preview">
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-gray-900">工程施工日誌</h2>
        <div className="flex justify-between items-end mt-2 px-4 text-sm text-gray-600">
          <span>填表人：{formData.author}</span>
          <span>{formData.date}</span>
        </div>
      </div>

      <div className="mb-6 border border-gray-300 text-sm">
        <div className="grid grid-cols-2">
          <div className="p-2 border-b border-r border-gray-300 flex"><span className="font-bold w-20">專案名稱</span>{formData.projectName}</div>
          <div className="p-2 border-b border-gray-300 flex"><span className="font-bold w-20">施工地點</span>{formData.location}</div>
          <div className="p-2 border-b border-r border-gray-300 flex"><span className="font-bold w-20">開工日期</span>{formData.startDate}</div>
          <div className="p-2 border-b border-gray-300 flex"><span className="font-bold w-20">預計完工</span>{formData.endDate}</div>
          <div className="p-2 border-b border-r border-gray-300 flex"><span className="font-bold w-20">天氣</span>{formData.weather}</div>
          <div className="p-2 border-b border-gray-300 flex"><span className="font-bold w-20">累計工期</span>第 {formData.dayCount} 天</div>
          <div className="p-2 border-r border-b border-gray-300 flex items-center bg-gray-50">
            <span className="font-bold w-20">工地整潔</span>
            <span className={formData.siteChecks.cleanliness ? "text-green-700" : "text-red-500"}>{formData.siteChecks.cleanliness ? "☑ 已確認" : "☐ 未確認"}</span>
          </div>
          <div className="p-2 border-b border-gray-300 flex items-center bg-gray-50">
            <span className="font-bold w-20">門窗關閉</span>
            <span className={formData.siteChecks.doorsClosed ? "text-green-700" : "text-red-500"}>{formData.siteChecks.doorsClosed ? "☑ 已確認" : "☐ 未確認"}</span>
          </div>
          <div className="p-2 border-r border-gray-300 flex items-center bg-gray-50">
            <span className="font-bold w-20">總電源</span>
            <span className={formData.siteChecks.powerOff ? "text-green-700" : "text-red-500"}>{formData.siteChecks.powerOff ? "☑ 已確認" : "☐ 未確認"}</span>
          </div>
          <div className="p-2 bg-gray-50"></div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-gray-800 mb-1">一、出工紀錄</h4>
          <table className="w-full text-sm border-collapse border border-gray-400">
            <thead><tr className="bg-gray-50"><th className="border border-gray-400 p-1 w-1/4">工種</th><th className="border border-gray-400 p-1 w-16">人數</th><th className="border border-gray-400 p-1">內容</th></tr></thead>
            <tbody>
              {formData.manpower.map(m => (
                <tr key={m.id}>
                  <td className="border border-gray-400 p-1 align-top pt-2">{m.type}</td>
                  <td className="border border-gray-400 p-1 text-center align-top pt-2">{m.count}</td>
                  <td className="border border-gray-400 p-1 whitespace-pre-line leading-relaxed">{m.note}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold"><td className="border border-gray-400 p-1 text-right">合計</td><td className="border border-gray-400 p-1 text-center">{formData.manpower.reduce((s, i) => s + Number(i.count), 0)}</td><td className="border border-gray-400"></td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-green-600 mb-1">二、明日預定項目</h4>
          <div className="border border-gray-400 p-2 text-sm min-h-[60px] whitespace-pre-line">{formData.planTomorrow}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><h4 className="font-bold bg-blue-50 p-1 pl-2 text-sm border-l-4 border-blue-400 mb-1">三、業主交辦</h4><div className="border border-gray-400 p-2 text-sm min-h-[60px] text-blue-900 whitespace-pre-line">{formData.ownerInstructions}</div></div>
          <div><h4 className="font-bold bg-red-50 p-1 pl-2 text-sm border-l-4 border-red-600 mb-1 text-red-800">四、工程檢討</h4><div className="border border-gray-400 p-2 text-sm min-h-[60px] text-red-700 whitespace-pre-line">{formData.engineeringReview}</div></div>
        </div>

        <div className="break-inside-avoid">
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-purple-600 mb-2">五、施工照片</h4>
          <div className="grid grid-cols-2 gap-4">
            {formData.photos.length > 0 ? formData.photos.map((p, i) => (
              <div key={i} className="border border-gray-300 p-1 break-inside-avoid">
                <div className="aspect-video w-full bg-gray-100 overflow-hidden"><img src={p.url} className="w-full h-full object-contain" /></div>
                <div className="text-xs p-1 bg-gray-50 border-t border-gray-200">{p.desc}</div>
              </div>
            )) : <div className="col-span-2 text-center text-gray-400 py-4 border border-gray-300">無照片</div>}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-16 text-sm text-gray-600 break-inside-avoid">
        <div className="flex flex-col items-center">
          {formData.ownerSignature ? <img src={formData.ownerSignature} className="h-12 -mb-2" /> : <div className="h-12"></div>}
          <div className="border-t border-gray-400 pt-1 w-32 text-center">業主簽章</div>
        </div>
      </div>
    </div>
  );

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50 print:hidden">
          <div className="flex items-center gap-2"><h2 className="text-lg font-bold">預覽列印模式</h2></div>
          <div className="flex gap-2">
            <button onClick={() => setIsPrintMode(false)} className="px-4 py-2 bg-slate-600 rounded text-sm flex gap-1"><ArrowLeft className="w-4 h-4"/> 返回</button>
            <button onClick={triggerBrowserPrint} onTouchEnd={triggerBrowserPrint} className="px-4 py-2 bg-blue-600 rounded font-bold text-sm flex gap-1 shadow"><Printer className="w-4 h-4"/> 確認列印</button>
          </div>
        </div>
        <div className="pt-20 pb-10 px-4 flex justify-center"><PreviewContent /></div>
        <style>{`@media print { body { background: white; } .print\\:hidden { display: none; } .pt-20 { padding-top: 0 !important; } #log-preview { border: none !important; width: 100% !important; margin: 0 !important; } html, body { height: auto !important; overflow: visible !important; } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className={`mx-auto bg-white shadow-xl rounded-xl border border-gray-200 transition-all ${splitView ? 'max-w-[1600px]' : 'max-w-4xl'}`}>
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6" /> 施工日誌</h1>
            <div className="flex items-center gap-2 mt-1 text-xs">
              {saveStatus === 'saved' && <span className="bg-green-500 px-2 py-0.5 rounded text-white flex gap-1"><Save className="w-3 h-3"/> 已儲存</span>}
              {saveStatus === 'error' && <span className="bg-red-500 px-2 py-0.5 rounded text-white">錯誤</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSplitView(!splitView)} className="hidden lg:flex px-3 py-2 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 gap-1 text-sm">{splitView ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>} 切換</button>
            <button onClick={handleReset} className="px-3 py-2 bg-red-800 text-red-100 rounded hover:bg-red-700 gap-1 flex text-sm"><RotateCcw className="w-4 h-4"/> 重置</button>
            <div className="lg:hidden flex gap-2">
              <button onClick={() => setActiveTab('edit')} className={`px-3 py-2 rounded text-sm ${activeTab==='edit'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300'}`}>編輯</button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-2 rounded text-sm ${activeTab==='preview'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300'}`}>預覽</button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`flex gap-8 ${splitView ? 'flex-row' : 'flex-col'}`}>
            {/* Editor */}
            <div className={`flex-1 ${(!splitView && activeTab === 'preview') ? 'hidden' : 'block'}`}>
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold flex gap-2 border-b pb-2"><FileText className="w-5 h-5 text-blue-500"/> 基本資訊</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm text-gray-600 mb-1">專案名稱</label><select name="projectName" value={formData.projectName} onChange={handleInputChange} className="w-full border rounded p-2 bg-white">{projectOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-600 mb-1">填表人</label><select name="author" value={formData.author} onChange={handleInputChange} className="w-full border rounded p-2 bg-white">{authorOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm text-gray-600 mb-1">開工日期</label><input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                    <div><label className="block text-sm text-gray-600 mb-1">預計完工</label><input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                    <div><label className="block text-sm text-gray-600 mb-1">今日日期</label><input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                    <div><label className="block text-sm text-gray-600 mb-1">施工天數</label><input type="number" name="dayCount" value={formData.dayCount} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                    <div><label className="block text-sm text-gray-600 mb-1">天氣</label><select name="weather" value={formData.weather} onChange={handleInputChange} className="w-full border rounded p-2 bg-white">{weatherOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-600 mb-1">施工地點</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2"><h3 className="text-lg font-semibold flex gap-2"><Users className="w-5 h-5 text-blue-500"/> 出工紀錄</h3><button onClick={addManpowerRow} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button></div>
                  <div className="space-y-3">
                    {formData.manpower.map(m => (
                      <div key={m.id} className="flex flex-col md:flex-row gap-2 md:items-start bg-gray-50 p-3 rounded border">
                        <div className="flex-1"><input type="text" placeholder="工種" value={m.type} onChange={e=>handleManpowerChange(m.id,'type',e.target.value)} className="w-full border rounded p-1.5 text-sm"/></div>
                        <div className="w-24"><input type="number" placeholder="人數" value={m.count} onChange={e=>handleManpowerChange(m.id,'count',e.target.value)} className="w-full border rounded p-1.5 text-sm text-center"/></div>
                        <div className="flex-[2]">
                          <textarea 
                            placeholder="內容 (例如：\n1. 天花板封板\n2. 窗簾盒製作)" 
                            value={m.note} 
                            onChange={e=>handleManpowerChange(m.id,'note',e.target.value)} 
                            className="w-full border border-gray-300 rounded p-2 text-sm h-24" 
                          />
                        </div>
                        <button onClick={()=>removeManpowerRow(m.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2 flex gap-2"><Hammer className="w-5 h-5 text-blue-500"/> 進度與檢討</h3>
                  <div><label className="block text-sm text-gray-600 mb-1">明日預定</label><textarea name="planTomorrow" value={formData.planTomorrow} onChange={handleInputChange} className="w-full border rounded p-2" rows="3"/></div>
                  <div><label className="block text-sm text-gray-600 mb-1">業主交辦</label><textarea name="ownerInstructions" value={formData.ownerInstructions} onChange={handleInputChange} className="w-full border rounded p-2 bg-blue-50" rows="3"/></div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-sm text-red-600 flex gap-1"><AlertCircle className="w-4 h-4"/> 工程檢討</label><button onClick={handleAiPolishReview} disabled={aiLoading.review} className="text-xs bg-purple-500 text-white px-2 py-1 rounded flex gap-1">{aiLoading.review ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} AI 潤飾</button></div>
                    <textarea name="engineeringReview" value={formData.engineeringReview} onChange={handleInputChange} className="w-full border rounded p-2 bg-red-50" rows="3"/>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2 flex gap-2"><ShieldCheck className="w-5 h-5 text-blue-500"/> 每日檢查</h3>
                  <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded border">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.siteChecks.cleanliness} onChange={()=>toggleCheck('cleanliness')} className="w-5 h-5"/> 工地整潔</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.siteChecks.doorsClosed} onChange={()=>toggleCheck('doorsClosed')} className="w-5 h-5"/> 門窗關閉</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.siteChecks.powerOff} onChange={()=>toggleCheck('powerOff')} className="w-5 h-5"/> 總電源關閉</label>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2 flex gap-2"><PenTool className="w-5 h-5 text-blue-500"/> 業主簽名</h3>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="border-2 border-gray-300 rounded bg-white overflow-hidden touch-none relative">
                      <canvas ref={canvasRef} width={300} height={150} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="bg-white cursor-crosshair block"/>
                      <div className="absolute top-2 right-2 text-xs text-gray-300 pointer-events-none">簽名區</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={clearSignature} className="px-3 py-2 bg-gray-200 rounded text-sm flex gap-1"><Trash2 className="w-4 h-4"/> 清除</button>
                      {formData.ownerSignature && <div className="text-xs text-green-600 flex gap-1"><CheckSquare className="w-3 h-3"/> 已簽名</div>}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2 flex gap-2"><ImageIcon className="w-5 h-5 text-blue-500"/> 現場照片</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer relative h-24 flex items-center justify-center hover:bg-gray-50">
                    <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                    <span className="text-gray-500 text-sm">點擊上傳照片 (自動壓縮)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.photos.map((p, i) => (
                      <div key={i} className="bg-white rounded border shadow-sm group">
                        <div className="relative aspect-video bg-gray-100">
                          <img src={p.url} className="w-full h-full object-cover"/>
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button onClick={()=>handleAiPhotoDesc(i)} className="bg-purple-500 text-white rounded-full p-1 shadow disabled:opacity-50">{aiLoading.photoIndex===i?<Loader2 className="w-3 h-3 animate-spin"/>:<Sparkles className="w-3 h-3"/>}</button>
                            <button onClick={()=>removePhoto(i)} className="bg-red-500 text-white rounded-full p-1 shadow"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </div>
                        <input type="text" placeholder="說明..." value={p.desc} onChange={e=>handlePhotoDescChange(i,e.target.value)} className="w-full p-1 text-sm border-t outline-none"/>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Preview (Desktop) */}
            <div className={`hidden lg:block w-1/2 sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto ${splitView?'':'hidden'}`}>
              <div className="bg-gray-100 p-4 rounded border h-full"><PreviewContent /></div>
            </div>
          </div>

          {/* Action Buttons (Mobile) */}
          <div className="mt-8 flex justify-center gap-4 lg:hidden pb-10">
            <button onClick={copyToClipboard} className="flex gap-2 bg-green-600 text-white px-4 py-3 rounded shadow font-medium"><Copy className="w-5 h-5"/> 複製文字</button>
            <button onClick={()=>setIsPrintMode(true)} className="flex gap-2 bg-slate-700 text-white px-4 py-3 rounded shadow font-medium"><Download className="w-5 h-5"/> 列印報表</button>
          </div>

          {/* Action Buttons (Desktop) */}
          <div className="hidden lg:flex fixed bottom-8 right-8 gap-4 z-40">
            <button onClick={copyToClipboard} className="flex gap-2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold hover:scale-105 transition"><Copy className="w-5 h-5"/> 複製文字</button>
            <button onClick={()=>setIsPrintMode(true)} className="flex gap-2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg font-bold hover:scale-105 transition"><Printer className="w-5 h-5"/> 進入列印模式</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;