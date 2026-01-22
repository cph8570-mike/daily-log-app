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
  Trash2
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('edit');
  const [splitView, setSplitView] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); 
  
  const [aiLoading, setAiLoading] = useState({
    photoIndex: null,
    review: false
  });

  // 請在此填入您的 API Key，如果沒有就留空
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
    siteChecks: {
      cleanliness: false,
      doorsClosed: false,
      powerOff: false
    },
    ownerSignature: null 
  };

  const getInitialState = () => {
    const savedData = localStorage.getItem('constructionLogData_v2');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (!parsedData.ownerSignature) parsedData.ownerSignature = null;
        return { ...defaultState, ...parsedData };
      } catch (e) {
        console.error("讀取儲存資料失敗，重置為預設值", e);
        return defaultState;
      }
    }
    return defaultState;
  };

  const [formData, setFormData] = useState(getInitialState);

  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1024) {
        setSplitView(false);
      } else {
        setSplitView(true);
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('constructionLogData_v2', JSON.stringify(formData));
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error("儲存失敗", e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         setSaveStatus('quota_error');
      } else {
         setSaveStatus('error');
      }
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
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
      };
    });
  };

  const callGeminiAPI = async (payload, endpoint = 'generateContent') => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:${endpoint}?key=${apiKey}`;
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i <= 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
      } catch (error) {
        if (i === 5) throw error;
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  };

  const handleAiPolishReview = async () => {
    if (!formData.engineeringReview) return;
    setAiLoading(prev => ({ ...prev, review: true }));
    try {
      const prompt = `請扮演一位專業的室內裝修工地主任。請將以下的工程檢討事項改寫得更加專業、語氣客觀且清晰。原內容：${formData.engineeringReview}`;
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const result = await callGeminiAPI(payload);
      const polishedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (polishedText) {
        setFormData(prev => ({ ...prev, engineeringReview: polishedText.trim() }));
      }
    } catch (error) {
      alert("AI 潤飾失敗，請確認 API Key 是否正確。");
    } finally {
      setAiLoading(prev => ({ ...prev, review: false }));
    }
  };

  const handleAiPhotoDesc = async (index) => {
    const photoData = formData.photos[index].url;
    if (!photoData) return;
    setAiLoading(prev => ({ ...prev, photoIndex: index }));
    try {
      const base64Data = photoData.split(',')[1];
      const mimeType = photoData.split(';')[0].split(':')[1];
      const prompt = "請用繁體中文，簡潔有力地描述這張施工現場照片的內容。";
      const payload = { contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }] }] };
      const result = await callGeminiAPI(payload);
      const description = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (description) {
        handlePhotoDescChange(index, description.trim());
      }
    } catch (error) {
      alert("AI 辨識失敗。");
    } finally {
      setAiLoading(prev => ({ ...prev, photoIndex: null }));
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要清除所有資料並重置嗎？這將刪除目前的照片與簽名。')) {
      localStorage.removeItem('constructionLogData_v2');
      window.location.reload();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManpowerChange = (id, field, value) => {
    const newManpower = formData.manpower.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setFormData(prev => ({ ...prev, manpower: newManpower }));
  };

  const addManpowerRow = () => {
    const newId = formData.manpower.length > 0 ? Math.max(...formData.manpower.map(m => m.id)) + 1 : 1;
    setFormData(prev => ({
      ...prev,
      manpower: [...prev.manpower, { id: newId, type: '', count: 1, note: '' }]
    }));
  };

  const removeManpowerRow = (id) => {
    setFormData(prev => ({
      ...prev,
      manpower: prev.manpower.filter(item => item.id !== id)
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = [];
    for (const file of files) {
      try {
        const compressedDataUrl = await compressImage(file);
        newPhotos.push({ url: compressedDataUrl, desc: '' });
      } catch (error) {
        console.error("Image compression failed", error);
      }
    }
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
  };

  const handlePhotoDescChange = (index, value) => {
    const newPhotos = [...formData.photos];
    newPhotos[index].desc = value;
    setFormData(prev => ({ ...prev, photos: newPhotos }));
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const toggleCheck = (field) => {
    setFormData(prev => ({
      ...prev,
      siteChecks: {
        ...prev.siteChecks,
        [field]: !prev.siteChecks[field]
      }
    }));
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault(); 
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignature();
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData(prev => ({ ...prev, ownerSignature: null }));
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setFormData(prev => ({ ...prev, ownerSignature: dataUrl }));
    }
  };

  useEffect(() => {
    if (activeTab === 'edit' && canvasRef.current) {
      // Just ensure context is ready
    }
  }, [activeTab]);

  const copyToClipboard = () => {
    const text = `
【施工日誌】${formData.date} (第 ${formData.dayCount} 天)
案名：${formData.projectName}
填表人：${formData.author}
天氣：${formData.weather}
-------------------
【出工人數】
${formData.manpower.map(m => `${m.type}：${m.count}人\n內容：${m.note}`).join('\n')}
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
    
    const btn = document.getElementById('copyBtn');
    if(btn) {
      const originalText = btn.innerText;
      btn.innerText = '已複製！';
      setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  const triggerBrowserPrint = () => {
    setTimeout(() => {
        window.print();
    }, 100);
  };

  // Preview Component
  const PreviewContent = () => (
    <div className="bg-white border border-gray-300 p-8 shadow-sm print:border-none print:shadow-none print:p-0 mx-auto max-w-[210mm] print:max-w-none print:w-full" id="log-preview">
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-gray-900">工程施工日誌</h2>
        <div className="flex justify-between items-end mt-2 px-4">
          <span className="text-sm text-gray-600">填表人：{formData.author}</span>
          <span className="text-sm text-gray-500">Daily Construction Report</span>
          <span className="text-sm text-gray-600">日期：{formData.date}</span>
        </div>
      </div>

      <div className="mb-6 border border-gray-300">
        <div className="grid grid-cols-2 text-sm">
          <div className="p-2 border-b border-r border-gray-300 flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">專案名稱</span>
            <span>{formData.projectName}</span>
          </div>
          <div className="p-2 border-b border-gray-300 flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">施工地點</span>
            <span>{formData.location || '全區'}</span>
          </div>
          <div className="p-2 border-b border-r border-gray-300 flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">開工日期</span>
            <span>{formData.startDate}</span>
          </div>
          <div className="p-2 border-b border-gray-300 flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">預計完工</span>
            <span>{formData.endDate}</span>
          </div>
            <div className="p-2 border-b border-r border-gray-300 flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">天氣</span>
            <span>{formData.weather}</span>
          </div>
          <div className="p-2 border-b flex">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">累計工期</span>
            <span className="font-bold text-blue-800">第 {formData.dayCount} 天</span>
          </div>
          
          <div className="p-2 border-r border-b border-gray-300 flex items-center bg-gray-50">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">工地整潔</span>
            <span className={formData.siteChecks.cleanliness ? "text-green-700 font-bold" : "text-red-500"}>
              {formData.siteChecks.cleanliness ? "☑ 已確認" : "☐ 未確認"}
            </span>
          </div>
          <div className="p-2 border-b flex items-center bg-gray-50">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">門窗關閉</span>
            <span className={formData.siteChecks.doorsClosed ? "text-green-700 font-bold" : "text-red-500"}>
              {formData.siteChecks.doorsClosed ? "☑ 已確認" : "☐ 未確認"}
            </span>
          </div>
            <div className="p-2 border-r border-gray-300 flex items-center bg-gray-50">
            <span className="font-bold text-gray-700 w-20 flex-shrink-0">總電源</span>
            <span className={formData.siteChecks.powerOff ? "text-green-700 font-bold" : "text-red-500"}>
              {formData.siteChecks.powerOff ? "☑ 已確認" : "☐ 未確認"}
            </span>
          </div>
          <div className="p-2 flex items-center bg-gray-50"></div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-gray-800 mb-1">一、出工紀錄</h4>
          <table className="w-full text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 p-1 text-left w-1/4">工種</th>
                <th className="border border-gray-400 p-1 text-center w-16">人數</th>
                <th className="border border-gray-400 p-1 text-left">工作內容</th>
              </tr>
            </thead>
            <tbody>
              {formData.manpower.map((m) => (
                <tr key={m.id}>
                  <td className="border border-gray-400 p-1 pl-2 align-top pt-2">{m.type}</td>
                  <td className="border border-gray-400 p-1 text-center align-top pt-2">{m.count}</td>
                  <td className="border border-gray-400 p-1 pl-2 whitespace-pre-line leading-relaxed">{m.note}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-400 p-1 pl-2 text-right">合計</td>
                <td className="border border-gray-400 p-1 text-center">
                  {formData.manpower.reduce((sum, item) => sum + Number(item.count), 0)}
                </td>
                <td className="border border-gray-400 p-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-green-600 mb-1">二、明日預定項目</h4>
          <div className="border border-gray-400 p-2 text-sm min-h-[80px] whitespace-pre-line">
            {formData.planTomorrow || '無紀錄'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
            <h4 className="font-bold bg-blue-50 p-1 pl-2 text-sm border-l-4 border-blue-400 mb-1">三、業主交辦事項</h4>
            <div className="border border-gray-400 p-2 text-sm min-h-[80px] whitespace-pre-line text-blue-900">
              {formData.ownerInstructions || '無'}
            </div>
          </div>
          <div>
            <h4 className="font-bold bg-red-50 p-1 pl-2 text-sm border-l-4 border-red-600 mb-1 text-red-800">四、工程檢討事項 (重要)</h4>
            <div className="border border-gray-400 p-2 text-sm min-h-[80px] whitespace-pre-line text-red-700 font-medium">
              {formData.engineeringReview || '無'}
            </div>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h4 className="font-bold bg-gray-100 p-1 pl-2 text-sm border-l-4 border-purple-600 mb-2">五、施工照片紀錄</h4>
          {formData.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {formData.photos.map((photo, i) => (
                <div key={i} className="border border-gray-300 p-1 break-inside-avoid">
                  <div className="aspect-video w-full overflow-hidden bg-gray-100">
                    <img src={photo.url} alt="施工照片" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-xs text-left p-2 border-t border-gray-200 bg-gray-50 min-h-[30px]">
                    <span className="font-bold text-gray-700 mr-2">照片 {i + 1}：</span>
                    {photo.desc || '（未填寫說明）'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-400 p-4 text-center text-sm text-gray-400">
              無照片上傳
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-16 text-sm text-gray-600 break-inside-avoid items-end">
        <div className="flex flex-col items-center">
            {formData.ownerSignature ? (
              <img src={formData.ownerSignature} alt="業主簽名" className="h-12 -mb-2" />
            ) : (
              <div className="h-12"></div>
            )}
            <div className="border-t border-gray-400 pt-1 w-32 text-center pb-2">業主簽章</div>
        </div>
      </div>
    </div>
  );

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">預覽列印模式</h2>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded">請確認下方內容正確</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPrintMode(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 rounded hover:bg-slate-500 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> 返回編輯
            </button>
            <button 
              onClick={triggerBrowserPrint}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors shadow-md font-bold text-sm"
            >
              <Printer className="w-4 h-4" /> 確認列印
            </button>
          </div>
        </div>
        <div className="pt-20 pb-10 px-4 flex justify-center">
          <PreviewContent />
        </div>
        <style>{`
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .pt-20 { padding-top: 0 !important; }
            .pb-10 { padding-bottom: 0 !important; }
            .min-h-screen { min-height: 0 !important; }
            #log-preview {
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className={`mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200 transition-all duration-300 ${splitView ? 'max-w-[1600px]' : 'max-w-4xl'}`}>
        
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              室內裝修施工日誌
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-400 text-sm">工程管理系統 v3.3</p>
              {saveStatus === 'saved' && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><Save className="w-3 h-3"/> 已自動儲存</span>}
              {saveStatus === 'error' && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">儲存錯誤</span>}
              {saveStatus === 'quota_error' && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> 儲存空間已滿</span>}
            </div>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setSplitView(!splitView)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors hidden lg:flex items-center gap-1"
              title={splitView ? "切換為單欄模式" : "切換為雙欄模式"}
            >
              {splitView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {splitView ? "單欄" : "雙欄"}
            </button>
             <button 
              onClick={handleReset}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-red-800 text-red-100 hover:bg-red-700 transition-colors flex items-center gap-1"
              title="清除所有資料並重置"
            >
              <RotateCcw className="w-4 h-4" /> 重置
            </button>
            <div className="lg:hidden flex gap-2">
              <button 
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                編輯
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                預覽
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`flex gap-8 ${splitView ? 'flex-row' : 'flex-col'}`}>
            
            <div className={`flex-1 transition-all ${splitView ? 'w-1/2' : 'w-full'} ${(!splitView && activeTab === 'preview') ? 'hidden' : 'block'}`}>
              <div className="space-y-8 animate-fadeIn">
                
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                    <FileText className="w-5 h-5 text-blue-500" /> 基本資訊
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">專案名稱</label>
                      <select 
                        name="projectName"
                        value={formData.projectName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {projectOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">填表人 (編寫者)</label>
                      <div className="relative">
                        <User className="absolute left-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select 
                          name="author"
                          value={formData.author}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md p-2 pl-8 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          {authorOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">開工日期</label>
                      <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">預計完工</label>
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">今日日期</label>
                      <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">施工天數</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">第</span>
                        <input type="number" name="dayCount" value={formData.dayCount} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-1.5 text-sm text-center" />
                        <span className="text-gray-500 text-sm">天</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">天氣</label>
                      <select 
                        name="weather" 
                        value={formData.weather} 
                        onChange={handleInputChange} 
                        className="w-full border border-gray-300 rounded-md p-2 outline-none bg-white"
                      >
                        {weatherOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">施工地點</label>
                      <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 outline-none" placeholder="例: 客廳, 全室" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" /> 出工紀錄
                    </h3>
                    <button onClick={addManpowerRow} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 font-medium flex items-center gap-1">
                      <Plus className="w-4 h-4" /> 新增工種
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.manpower.map((worker) => (
                      <div key={worker.id} className="flex flex-col md:flex-row gap-2 md:items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <input type="text" placeholder="工種 (例: 木工)" value={worker.type} onChange={(e) => handleManpowerChange(worker.id, 'type', e.target.value)} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                        </div>
                        <div className="w-full md:w-24">
                          <input type="number" placeholder="人數" value={worker.count} onChange={(e) => handleManpowerChange(worker.id, 'count', e.target.value)} className="w-full border border-gray-300 rounded p-1.5 text-sm text-center" />
                        </div>
                        <div className="flex-[2]">
                          <textarea 
                            placeholder="施工內容簡述 (可換行)" 
                            value={worker.note} 
                            onChange={(e) => handleManpowerChange(worker.id, 'note', e.target.value)} 
                            className="w-full border border-gray-300 rounded p-1.5 text-sm h-16 resize-none"
                          />
                        </div>
                        <button onClick={() => removeManpowerRow(worker.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded h-10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                    <Hammer className="w-5 h-5 text-blue-500" /> 預定進度
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">明日預定項目</label>
                      <textarea name="planTomorrow" value={formData.planTomorrow} onChange={handleInputChange} rows="4" className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none" placeholder="預計工作..." />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-8">
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                      <CheckSquare className="w-5 h-5 text-blue-500" /> 交辦與檢討
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">業主交辦事項</label>
                      <textarea 
                        name="ownerInstructions"
                        value={formData.ownerInstructions}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full border border-blue-200 rounded-md p-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="業主交代的細節..."
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> 工程檢討事項 (重要)
                        </label>
                        <button
                          onClick={handleAiPolishReview}
                          disabled={aiLoading.review || !formData.engineeringReview}
                          className="text-xs bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-2 py-1 rounded-full flex items-center gap-1 hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          {aiLoading.review ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI 潤飾
                        </button>
                      </div>
                      <textarea 
                        name="engineeringReview"
                        value={formData.engineeringReview}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full border border-red-200 rounded-md p-2 text-sm bg-red-50 focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="施工錯誤、圖面檢討、需修正項目..."
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                      <ShieldCheck className="w-5 h-5 text-blue-500" /> 每日離場檢查
                    </h3>
                    <div className="flex flex-wrap gap-4 md:gap-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={formData.siteChecks.cleanliness} 
                          onChange={() => toggleCheck('cleanliness')}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`font-medium ${formData.siteChecks.cleanliness ? 'text-green-700' : 'text-gray-600'}`}>工地整潔已完成</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={formData.siteChecks.doorsClosed} 
                          onChange={() => toggleCheck('doorsClosed')}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`font-medium ${formData.siteChecks.doorsClosed ? 'text-green-700' : 'text-gray-600'}`}>門窗已確實關閉</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={formData.siteChecks.powerOff} 
                          onChange={() => toggleCheck('powerOff')}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`font-medium ${formData.siteChecks.powerOff ? 'text-green-700' : 'text-gray-600'}`}>總電源已關閉</span>
                      </label>
                    </div>
                  </section>
                  
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                      <PenTool className="w-5 h-5 text-blue-500" /> 業主電子簽名
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden touch-none relative flex-shrink-0">
                        <canvas 
                          ref={canvasRef}
                          width={300}
                          height={150}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="bg-white cursor-crosshair block"
                        />
                        <div className="absolute top-2 right-2 text-xs text-gray-300 pointer-events-none select-none">簽名區域</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={clearSignature}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> 清除簽名
                        </button>
                        {formData.ownerSignature && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" /> 已儲存業主簽名
                          </div>
                        )}
                        <p className="text-xs text-gray-500 w-48">
                          請業主在左側方框內簽名確認交辦事項。支援滑鼠與觸控。簽名將自動顯示於報表下方。
                        </p>
                      </div>
                    </div>
                  </section>

                   <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                       <ImageIcon className="w-5 h-5 text-blue-500" /> 現場照片
                    </h3>
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative h-32 flex flex-col justify-center items-center">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">點擊或拖曳上傳照片</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden group">
                            <div className="relative aspect-video bg-gray-100">
                              <img src={photo.url} alt={`Site ${index}`} className="w-full h-full object-cover" />
                              <div className="absolute top-2 right-2 flex gap-1">
                                 <button 
                                  onClick={() => handleAiPhotoDesc(index)}
                                  disabled={aiLoading.photoIndex === index}
                                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full p-1.5 shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                                  title="AI 自動辨識照片內容"
                                >
                                  {aiLoading.photoIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={() => removePhoto(index)}
                                  className="bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                                  title="移除照片"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="p-2">
                              <input 
                                type="text" 
                                placeholder="請輸入照片說明..." 
                                value={photo.desc}
                                onChange={(e) => handlePhotoDescChange(index, e.target.value)}
                                className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className={`hidden lg:block w-1/2 sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto ${splitView ? '' : 'hidden'}`}>
              <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 h-full">
                <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> 即時預覽 (A4 樣式)
                </h3>
                <div className="transform origin-top scale-[0.85]">
                  <PreviewContent />
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 flex justify-center gap-4 lg:hidden">
             <button 
                id="copyBtn"
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 shadow-md transition-all font-medium"
              >
                <Copy className="w-5 h-5" /> 複製文字
              </button>
              <button 
                onClick={() => setIsPrintMode(true)}
                className="flex items-center gap-2 bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-800 shadow-md transition-all font-medium"
              >
                <Download className="w-5 h-5" /> 列印報表 (PDF)
              </button>
          </div>

          <div className="hidden lg:flex fixed bottom-8 right-8 gap-4 z-40">
             <button 
                id="copyBtnDesktop"
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 shadow-lg transition-all font-bold"
              >
                <Copy className="w-5 h-5" /> 複製文字
              </button>
              <button 
                onClick={() => setIsPrintMode(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-full hover:bg-slate-900 shadow-lg transition-all font-bold"
              >
                <Printer className="w-5 h-5" /> 進入列印模式
              </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;