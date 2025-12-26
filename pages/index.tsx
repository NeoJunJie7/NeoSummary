import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useHighlight } from '../hooks/useHighlight';
import { countWords } from '../lib/utils';

function Index() {
  const [message, setMessage] = useState("Loading");
  const [inputText, setInputText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [originalSummary, setOriginalSummary] = useState(""); 
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); 
  const [summaryTitle, setSummaryTitle] = useState(""); 

  const [highlight, setHighlight] = useState(false);
  const [annotation, setAnnotation] = useState(false);
  const [translate, setTranslate] = useState(false);
  const [bulletsOn, setBulletsOn] = useState(false);
  const [bullets, setBullets] = useState<string[]>([]);
  const [bulletsLoading, setBulletsLoading] = useState(false);
  const [bulletsError, setBulletsError] = useState<string | null>(null);
  const [translateSource, setTranslateSource] = useState<"summary" | "original">("summary");
  const [exportKind, setExportKind] = useState<"summary" | "translated" | "bullets">("summary");
  const [exportFormat, setExportFormat] = useState<"txt" | "doc" | "pdf">("txt");

  // track logged in user
  const [user, setUser] = useState<any | null>(null);

  // dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Help modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [hfLoading, setHfLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [outputWordCount, setOutputWordCount] = useState<number>(0);
  const [outputCharCount, setOutputCharCount] = useState<number>(0);

  const langOptions = [
    { value: "zh", label: "Chinese" },
    { value: "ms", label: "Malay" },
    { value: "en", label: "English" },
  ];
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const [summaryLengthPercent, setSummaryLengthPercent] = useState<number>(50); 
  const [summaryStyle, setSummaryStyle] = useState<'balanced' | 'priority'>('balanced'); 
  const [autoTranslate, setAutoTranslate] = useState<boolean>(false); 
  const [uiFontSize, setUiFontSize] = useState<number>(14); 
  const [uiLanguage, setUiLanguage] = useState<string>("en"); 
  const [maxSummaryWords, setMaxSummaryWords] = useState<number | ''>(''); 
  const [lengthMode, setLengthMode] = useState<'percentage' | 'maxWords'>('percentage'); 

  const router = useRouter();

  // Helper to namespace settings per user
  const getSettingsKey = (uid?: string | null) => (uid ? `neoSettings_${uid}` : "neoSettings");
  const clampFontSize = (size: number) => {
    const n = Number.isFinite(size) ? size : 14;
    return Math.min(20, Math.max(12, n));
  };

  // Basic UI copy by language (en, zh, ms)
  const uiText: Record<string, Record<string, string>> = {
    en: {
      highlight: "Highlight",
      translate: "Translate",
      bullets: "Bullet points",
      language: "Language",
      upload: "Upload File",
      inputPlaceholder: "Input text here",
      summaryPlaceholder: "Summary result will appear here",
      noBullets: "No bullet points generated.",
      summaryTab: "Summary",
      translatedTab: "Translated",
      bulletsTab: "Bullets",
      exportLabel: "Export:",
      download: "Download",
      clickToSave: "Click to Save",
      translateSummary: "Translate summary",
      translateOriginal: "Translate original",
      translateBtn: "Translate",
      summarizing: "Summarizing...",
      summarizeBtn: "Summarize",
      translatingSummary: "Translating summary...",
      translatingOriginal: "Translating original text...",
      pleaseEnableTranslation: "Please enable translation and select a target language.",
      pleaseSelectLanguage: "Please select a target language.",
      pleaseEnterText: "Please enter text to summarize.",
      pleaseEnterTextTranslate: "Please enter text to translate.",
      pleaseSummarizeFirst: "Please summarize first to translate the summary.",
      summarizeResultHere: "Summary result will appear here",
      bulletsConverting: "Converting to bullet points...",
      helpTitle: "NeoSummary Help Guide",
      helpIntro: "Welcome to NeoSummary! This guide will walk you through all the features of the app.",
      helpLogin: "1. Getting Started: Click 'Login' or 'Register' in the top right to create an account or sign in.",
      helpUpload: "2. Upload Documents: Use the 'Upload File' button in the sidebar to upload PDF, DOCX, or TXT files for summarization.",
      helpInput: "3. Input Text: Type or paste your text in the left input box.",
      helpSummarize: "4. Summarize: Click the 'Summarize' button to generate a summary of your text.",
      helpTranslate: "5. Translate: Toggle 'Translate' in the sidebar, select a language, and click 'Translate' to translate the summary or original text.",
      helpBullets: "6. Bullet Points: Toggle 'Bullet points' to convert the summary into bullet points.",
      helpSave: "7. Save Summaries: After summarizing, click 'Click to Save' to save your summary with a title.",
      helpHistory: "8. View History: Click 'Summary History' in the top right to view and manage your saved summaries.",
      helpProfile: "9. Profile & Settings: Click your profile picture to access Profile and Settings pages.",
      helpClose: "Close Help",
    },
    zh: {
      highlight: "高亮",
      translate: "翻译",
      bullets: "要点",
      language: "语言",
      upload: "上传文件",
      inputPlaceholder: "在此输入文本",
      summaryPlaceholder: "摘要结果显示在此",
      noBullets: "暂无要点。",
      summaryTab: "摘要",
      translatedTab: "翻译",
      bulletsTab: "要点",
      exportLabel: "导出：",
      download: "下载",
      clickToSave: "点击保存",
      translateSummary: "翻译摘要",
      translateOriginal: "翻译原文",
      translateBtn: "翻译",
      summarizing: "正在生成摘要...",
      summarizeBtn: "生成摘要",
      translatingSummary: "正在翻译摘要...",
      translatingOriginal: "正在翻译原文...",
      pleaseEnableTranslation: "请启用翻译并选择目标语言。",
      pleaseSelectLanguage: "请选择目标语言。",
      pleaseEnterText: "请输入要摘要的文本。",
      pleaseEnterTextTranslate: "请输入要翻译的文本。",
      pleaseSummarizeFirst: "请先生成摘要再进行翻译。",
      summarizeResultHere: "摘要结果显示在此",
      bulletsConverting: "正在转换为要点...",
      helpTitle: "NeoSummary 帮助指南",
      helpIntro: "欢迎使用 NeoSummary！本指南将引导您了解应用的所有功能。",
      helpLogin: "1. 开始使用：点击右上角的“登录”或“注册”来创建账户或登录。",
      helpUpload: "2. 上传文档：使用侧边栏中的“上传文件”按钮上传 PDF、DOCX 或 TXT 文件进行摘要。",
      helpInput: "3. 输入文本：在左侧输入框中键入或粘贴您的文本。",
      helpSummarize: "4. 生成摘要：点击“生成摘要”按钮来生成文本摘要。",
      helpTranslate: "5. 翻译：切换侧边栏中的“翻译”，选择语言，然后点击“翻译”来翻译摘要或原文。",
      helpBullets: "6. 要点：切换“要点”将摘要转换为要点。",
      helpSave: "7. 保存摘要：摘要后，点击“点击保存”以标题保存您的摘要。",
      helpHistory: "8. 查看历史：点击右上角的“摘要历史”查看和管理已保存的摘要。",
      helpProfile: "9. 个人资料和设置：点击您的头像访问个人资料和设置页面。",
      helpClose: "关闭帮助",
    },
    ms: {
      highlight: "Sorotan",
      translate: "Terjemah",
      bullets: "Poin penting",
      language: "Bahasa",
      upload: "Muat naik fail",
      inputPlaceholder: "Masukkan teks di sini",
      summaryPlaceholder: "Hasil ringkasan akan dipaparkan di sini",
      noBullets: "Tiada poin penting dijana.",
      summaryTab: "Ringkasan",
      translatedTab: "Diterjemah",
      bulletsTab: "Poin",
      exportLabel: "Eksport:",
      download: "Muat turun",
      clickToSave: "Klik untuk simpan",
      translateSummary: "Terjemah ringkasan",
      translateOriginal: "Terjemah asal",
      translateBtn: "Terjemah",
      summarizing: "Sedang meringkas...",
      summarizeBtn: "Ringkaskan",
      translatingSummary: "Sedang terjemah ringkasan...",
      translatingOriginal: "Sedang terjemah teks asal...",
      pleaseEnableTranslation: "Sila aktifkan terjemahan dan pilih bahasa sasaran.",
      pleaseSelectLanguage: "Sila pilih bahasa sasaran.",
      pleaseEnterText: "Sila masukkan teks untuk diringkas.",
      pleaseEnterTextTranslate: "Sila masukkan teks untuk diterjemah.",
      pleaseSummarizeFirst: "Sila ringkaskan dahulu sebelum terjemah ringkasan.",
      summarizeResultHere: "Hasil ringkasan akan dipaparkan di sini",
      bulletsConverting: "Menukar kepada poin penting...",
      helpTitle: "Panduan Bantuan NeoSummary",
      helpIntro: "Selamat datang ke NeoSummary! Panduan ini akan membimbing anda melalui semua ciri aplikasi.",
      helpLogin: "1. Bermula: Klik 'Login' atau 'Register' di bahagian kanan atas untuk membuat akaun atau log masuk.",
      helpUpload: "2. Muat Naik Dokumen: Gunakan butang 'Muat naik fail' di bar sisi untuk memuat naik fail PDF, DOCX, atau TXT untuk diringkas.",
      helpInput: "3. Input Teks: Taip atau tampal teks anda dalam kotak input kiri.",
      helpSummarize: "4. Ringkaskan: Klik butang 'Ringkaskan' untuk menjana ringkasan teks anda.",
      helpTranslate: "5. Terjemah: Togol 'Terjemah' di bar sisi, pilih bahasa, dan klik 'Terjemah' untuk menterjemah ringkasan atau teks asal.",
      helpBullets: "6. Poin Penting: Togol 'Poin penting' untuk menukar ringkasan kepada poin penting.",
      helpSave: "7. Simpan Ringkasan: Selepas meringkas, klik 'Klik untuk simpan' untuk menyimpan ringkasan anda dengan tajuk.",
      helpHistory: "8. Lihat Sejarah: Klik 'Sejarah Ringkasan' di bahagian kanan atas untuk melihat dan mengurus ringkasan yang disimpan.",
      helpProfile: "9. Profil & Tetapan: Klik gambar profil anda untuk mengakses halaman Profil dan Tetapan.",
      helpClose: "Tutup Bantuan",
    },
  };

  const tr = (key: string) => (uiText[uiLanguage] && uiText[uiLanguage][key]) || uiText.en[key] || key;

  // Load settings from localStorage on mount and when user changes, and sync changes
  const loadSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(getSettingsKey(user?.uid)) || "{}");
      if (saved.language) setUiLanguage(saved.language);
      if (saved.fontSize) setUiFontSize(clampFontSize(saved.fontSize));
      if (saved.defaultSummaryLength) setSummaryLengthPercent(saved.defaultSummaryLength);
      if (saved.defaultSummaryStyle) setSummaryStyle(saved.defaultSummaryStyle);
      if (saved.defaultTranslateLang) {
        setSelectedLang(saved.defaultTranslateLang);
        setTranslate(true); 
      }
      if (typeof saved.autoTranslate === "boolean") setAutoTranslate(saved.autoTranslate);
      if (saved.defaultExportFormat) setExportFormat(saved.defaultExportFormat);
      if (saved.defaultExportKind) setExportKind(saved.defaultExportKind);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  useEffect(() => {
    // Load settings once on mount / when user changes
    loadSettings();
    
    // Listen for storage changes (when settings are updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === getSettingsKey(user?.uid)) {
        loadSettings();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.uid]);

  // Apply UI language to document
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = uiLanguage || "en";
    }
  }, [uiLanguage]);

  // Apply UI font size to document (clamped)
  useEffect(() => {
    if (typeof document !== "undefined") {
      const clamped = clampFontSize(uiFontSize);
      document.documentElement.style.setProperty("--ui-font-size", `${clamped}px`);
      document.body.style.fontSize = `${clamped}px`;
    }
  }, [uiFontSize]);

  // Highlight hook
  const { segments: highlightSegments, keyPoints, loading: highlightLoading, error: highlightError } =
    useHighlight({ enabled: highlight, sourceText: inputText });

  const [highlightHtml, setHighlightHtml] = useState<string>("");

  // Helper functions for highlighting
  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildHighlightHtml(text: string, points: string[]): string {
    if (!text) return "";
    if (!points || points.length === 0) return escapeHtml(text);
    
    // Build non-overlapping ranges from keyPoints
    const ranges: { start: number; end: number }[] = [];
    points.forEach(p => {
      const needle = p.trim();
      if (!needle) return;
      let searchFrom = 0;
      let idx: number;
      // Find all occurrences
      while ((idx = text.indexOf(needle, searchFrom)) !== -1) {
        const end = idx + needle.length;
        // Check for overlaps
        if (!ranges.some(r => !(end <= r.start || idx >= r.end))) {
          ranges.push({ start: idx, end });
        }
        searchFrom = idx + 1;
      }
    });
    ranges.sort((a, b) => a.start - b.start);

    let out = "";
    let cursor = 0;
    for (const r of ranges) {
      out += escapeHtml(text.slice(cursor, r.start));
      const segment = escapeHtml(text.slice(r.start, r.end));
      out += `<mark style="background:rgba(255,230,140,0.85);padding:2px 4px;border-radius:3px;font-weight:600;">${segment}</mark>`;
      cursor = r.end;
    }
    out += escapeHtml(text.slice(cursor));
    return out;
  }

  useEffect(() => {
    if (highlight && keyPoints.length > 0) {
      setHighlightHtml(buildHighlightHtml(inputText, keyPoints));
    } else {
      setHighlightHtml("");
    }
  }, [highlight, inputText, keyPoints]);

  // listen for firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setMessage(`Welcome ${u.displayName || u.email}`);
      } else {
        setMessage("Welcome");
      }
    });
    return () => unsubscribe();
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // update counts in real time when inputText changes
  useEffect(() => {
    const text = inputText || "";
    const chars = text.length;
    const words = text.trim().length === 0 ? 0 : countWords(text); 
    setCharCount(chars);
    setWordCount(words);
  }, [inputText]);

  // update output counts in real time when displayText or bullets change
  useEffect(() => {
    let textToCount = "";
    
    if (bulletsOn && bullets.length > 0) {
      // Count bullets text
      textToCount = bullets.join(" ");
    } else if (displayText) {
      // Count displayText, removing HTML tags for accurate counting
      textToCount = displayText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
    
    const chars = textToCount.length;
    const words = textToCount.length === 0 ? 0 : countWords(textToCount); 
    setOutputCharCount(chars);
    setOutputWordCount(words);
  }, [displayText, bullets, bulletsOn]);

  // Reset display text when original summary changes
  useEffect(() => {
    setDisplayText(originalSummary);
  }, [originalSummary]);
  
  // Clear translation on toggle/language change
  useEffect(() => {
    if (!translate) {
      setSelectedLang(null);
      if (displayText !== originalSummary) {
        setDisplayText(originalSummary);
      }
    }
    
    // If translation is ON and a new language is selected, 
    // and the currently displayed text is a translation (not the original summary),
    // revert the display back to the original summary. This cues the user to click 'Translate'.
    if (translate && selectedLang && originalSummary && displayText !== originalSummary) {
        setDisplayText(originalSummary);
    }
    
  }, [translate, selectedLang, originalSummary]); 

  // Hook to check local storage on initial load to restore summary history
  useEffect(() => {
    const restoredData = localStorage.getItem('restoredSummary');
    if (restoredData) {
      try {
        const item = JSON.parse(restoredData);
        // Set the state to restore the user's previous session
        setInputText(item.inputText || "");
        setOriginalSummary(item.summaryResult || "");
        setDisplayText(item.summaryResult || "");
        
        // Clean up local storage
        localStorage.removeItem('restoredSummary');
        
        // Provide user feedback
        setMessage("Restored previous summary session.");
      } catch (e) {
        console.error("Failed to parse restored summary data.");
      }
    }
  }, []); 

  const handleSavedHistory = () => router.push('/summary-history'); 

  // Save Function
  const saveSummaryHistory = async (title: string, originalText: string, summaryText: string, config: any) => {
    if (!user || !user.uid) {
      console.warn("User not logged in. Skipping history save.");
      return;
    }

    try {
      await fetch("/api/save-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          title: title, 
          originalText: originalText,
          summaryText: summaryText,
          config: config
        })
      });
    } catch (e) {
      console.error("Client side error sending summary to save API:", e);
    }
  };

  const handleSaveClick = () => {
    if (!user || !originalSummary) {
        alert("Please log in and summarize content before saving.");
        return;
    }
    // Open the modal to get the title
    setIsSaveModalOpen(true);
  };

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      setDisplayText(tr("pleaseEnterText"));
      setOriginalSummary("");
      return;
    }
    setHfLoading(true);
    setDisplayText("Summarizing...");
    setOriginalSummary(""); 
    setBullets([]); 
    try {
      const sumResp = await fetch("/api/summarize-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          lengthPercent: lengthMode === 'percentage' ? summaryLengthPercent : undefined,
          style: summaryStyle,
          // Only send maxWords if in maxWords mode and user provided a positive number
          maxWords: lengthMode === 'maxWords' && typeof maxSummaryWords === 'number' && maxSummaryWords > 0 ? maxSummaryWords : undefined
        })
      });

      let sumJson: any;
      try { sumJson = await sumResp.json(); }
      catch {
        const raw = await sumResp.text();
        setDisplayText(`Unexpected response: ${raw.slice(0,120)}`);
        setHfLoading(false);
        return;
      }

      if (sumJson?.error && !sumJson?.summary) {
        setDisplayText(`Error: ${sumJson.error}`);
        setHfLoading(false);
        return;
      }

      const summary = (sumJson.summary || "").trim();
      
      // Store the original HTML summary and set it as the display text
      setOriginalSummary(summary || "No summary returned.");
      setDisplayText(summary || "No summary returned.");
      
      // Call the secure save function (only if user is logged in)
      const config = {
          lengthPercent: summaryLengthPercent,
          model: "gemini-2.5-flash",
          style: summaryStyle
      };
      saveSummaryHistory(`Summary: ${new Date().toLocaleDateString()}`, inputText, summary, config);
      
      
      // Auto-translate if enabled and language is selected
      // Check both selectedLang state and defaultTranslateLang from settings
      try {
        const settings = JSON.parse(localStorage.getItem(getSettingsKey(user?.uid)) || "{}");
        const langToUse = selectedLang || settings.defaultTranslateLang;
        
        if (autoTranslate && langToUse && summary) {
          // Ensure selectedLang is set if it wasn't already
          if (!selectedLang && settings.defaultTranslateLang) {
            setSelectedLang(settings.defaultTranslateLang);
          }
          // Small delay to let UI update, then translate with toggle check bypassed
          // Pass the summary directly to avoid state timing issues
          setTimeout(() => {
            handleTranslate(true, langToUse, summary); 
          }, 500);
        }
      } catch (e) {
        // Fallback: try to read settings again or use selectedLang
        try {
          const fallbackSettings = JSON.parse(localStorage.getItem(getSettingsKey(user?.uid)) || "{}");
          const fallbackLang = selectedLang || fallbackSettings.defaultTranslateLang;
          if (autoTranslate && fallbackLang && summary) {
            setTimeout(() => {
              handleTranslate(true, fallbackLang, summary);
            }, 500);
          }
        } catch (e2) {
          // Last resort: use selectedLang if available
          if (autoTranslate && selectedLang && summary) {
            setTimeout(() => {
              handleTranslate(true, undefined, summary);
            }, 500);
          }
        }
      }
      
    } catch (e: any) {
      setDisplayText(`Error: ${String(e?.message ?? e)}`);
    } finally {
      setHfLoading(false);
    }
  };

  const handleTranslate = async (skipToggleCheck: boolean = false, langOverride?: string | null, summaryOverride?: string) => {
    // Use langOverride if provided (for auto-translate), otherwise use selectedLang
    const langToUse = langOverride !== undefined ? langOverride : selectedLang;
    
    // Skip toggle check when called from auto-translate
    if (!skipToggleCheck && (!translate || !langToUse)) {
        setDisplayText(tr("pleaseEnableTranslation"));
        return;
    }
    
    // Still need a language even when skipping toggle check
    if (!langToUse) {
        setDisplayText(tr("pleaseSelectLanguage"));
        return;
    }

    // Use summaryOverride if provided (for auto-translate), otherwise use originalSummary state
    const summaryText = (summaryOverride !== undefined ? summaryOverride : originalSummary || "").trim();
    const inputTextToUse = (inputText || "").trim();

    // Decide source based on user selection (or default to summary for auto-translate)
    const wantsSummary = skipToggleCheck ? true : translateSource === "summary";
    if (wantsSummary && !summaryText) {
      setDisplayText(tr("pleaseSummarizeFirst"));
      return;
    }
    if (!wantsSummary && !inputTextToUse) {
      setDisplayText(tr("pleaseEnterTextTranslate"));
      return;
    }

    setIsTranslating(true);
    const isTranslatingSummary = wantsSummary;
    setDisplayText(isTranslatingSummary ? tr("translatingSummary") : tr("translatingOriginal"));

    // Use summary or original input text based on selection
    let sourceText = "";
    if (wantsSummary) {
      // Translate the summary; convert basic <p> wrappers back to paragraphs
      sourceText = summaryText
        .replace(/<\/p>\s*<p>/gi, "\n\n")
        .replace(/<\/?p>/gi, "")
        .trim();
    } else {
      // Translate the original input text directly
      sourceText = inputTextToUse;
    }
    
    const textToTranslate = sourceText;

    try {
      const trResp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToTranslate, target: langToUse })
      });
      
      const trJson = await trResp.json();

      if (trJson?.error) {
        setDisplayText(`Translation error: ${trJson.error}`);
      } else {
        const translated = trJson.translated ?? trJson.translation ?? "";
        
        // Use the formatAsHtmlParagraphs logic locally for display
        // This ensures the plain text response from the API is turned back into <p> tags
        const htmlTranslated = translated.split(/\n\s*\n/).filter((p: string) => p.trim() !== '')
            .map((p: string) => `<p>${p.trim()}</p>`).join('\n');
            
        setDisplayText(htmlTranslated || originalSummary);
      }
    } catch (e: any) {
      setDisplayText(`Error: ${String(e?.message ?? e)}`);
    } finally {
      setIsTranslating(false);
    }
  };


  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FIX 1: Set loading state immediately upon file selection.
    setIsUploading(true);

    if (!file.type.match('application/pdf|application/vnd.openxmlformats-officedocument.wordprocessingml.document|text/plain')) {
      alert('Please upload a PDF, DOCX, or TXT file');
      // FIX 2: Explicitly reset loading state if validation fails and we exit.
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      if (data.text) {
        setInputText(data.text);
      } else {
        throw new Error('No text content extracted');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to process document');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Export helpers ---
  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").trim();

  const getExportText = () => {
    if (exportKind === "bullets") {
      if (!bullets.length) return "";
      return bullets.map((b) => `• ${stripHtml(b)}`).join("\n");
    }
    const base = exportKind === "translated" ? displayText : (originalSummary || displayText);
    return stripHtml(base || "");
  };

  const downloadBlob = (data: BlobPart, mime: string, filename: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsTxt = (text: string) => {
    downloadBlob(text, "text/plain;charset=utf-8", `export-${exportKind}.txt`);
  };

  const exportAsDoc = (text: string) => {
    // Word-friendly HTML saved with .doc extension (opens reliably in Word)
    const escaped = text
      .split("\n")
      .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${escaped}</body></html>`;
    downloadBlob(html, "application/msword", `export-${exportKind}.doc`);
  };

  const exportAsPdf = (text: string) => {
    // Browser-native print-to-PDF: open a new window and invoke print.
    const escaped = text
      .split("\n")
      .map((p) => `<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:14px;">${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title></head><body>${escaped}<script>window.onload=()=>{window.print();}</script></body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      // Fallback: download HTML as .pdf file (not true PDF but saves content)
      downloadBlob(html, "application/pdf", `export-${exportKind}.pdf`);
    }
  };

  const handleExport = () => {
    const text = getExportText();
    if (!text) {
      setMessage("Nothing to export yet.");
      return;
    }
    if (exportFormat === "txt") exportAsTxt(text);
    else if (exportFormat === "doc") exportAsDoc(text);
    else exportAsPdf(text);
  };

  const handleSave = () => console.log("Saving...");
  const handleLoginClick = () => router.push('/login');
  const handleRegisterClick = () => router.push('/register');
  const handleSavedAnnotations = () => router.push('/saved-annotations');
  const handleSavedNotes = () => router.push('/saved-notes');
  const goToProfile = () => { setMenuOpen(false); router.push('/profile'); };
  const goToSettings = () => { setMenuOpen(false); router.push('/settings'); };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Convert current summary to bullets when toggled or when summary changes
  useEffect(() => {
    if (!bulletsOn) {
      setBullets([]);
      setBulletsLoading(false);
      setBulletsError(null);
      return;
    }
    // Use the currently displayed text for bullet generation
    const text = (displayText || "").trim();
    if (!text) {
      setBullets([]);
      return;
    }
    let cancelled = false;
    setBulletsLoading(true);
    setBulletsError(null);
    
    // Remove HTML tags for bullet API
    const textForBullets = text.replace(/<p>|<\/p>|\n/g, '').trim(); 

    // If translation is enabled and a target language is selected, instruct bullet API
    const targetLang = translate && selectedLang ? selectedLang : null;
    
    fetch("/api/bullets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textForBullets, maxBullets: 14, targetLang })
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Bullet conversion failed");
        return j;
      })
      .then((j) => {
        if (cancelled) return;
        setBullets(Array.isArray(j?.bullets) ? j.bullets : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setBulletsError(String(e?.message ?? e));
        setBullets([]);
      })
      .finally(() => {
        if (cancelled) return;
        setBulletsLoading(false);
      });
    return () => { cancelled = true; };
  }, [bulletsOn, displayText]); 

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, backgroundColor: '#f0f0f0', minHeight: '100vh', fontSize: `${uiFontSize}px` }}>
      
      {/* Save Summary Modal */}
      {isSaveModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: '15px' }}>Enter Title for Summary</h3>
            <input
              type="text"
              value={summaryTitle}
              onChange={(e) => setSummaryTitle(e.target.value)}
              placeholder="e.g., Q4 Report Summary"
              style={{ width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                style={{ padding: '10px 15px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (summaryTitle.trim()) {
                    const config = {
                        lengthPercent: summaryLengthPercent,
                        model: "gemini-2.5-flash"
                    };
                    saveSummaryHistory(summaryTitle.trim(), inputText, originalSummary, config);
                    setIsSaveModalOpen(false);
                    setSummaryTitle(""); 
                  } else {
                    alert("Title cannot be empty.");
                  }
                }}
                disabled={!summaryTitle.trim()}
                style={{ padding: '10px 15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* End Save Summary Modal */}

      {/* Help Modal */}
      {isHelpOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>{tr("helpTitle")}</h2>
            <p style={{ marginBottom: '20px' }}>{tr("helpIntro")}</p>
            <ol style={{ lineHeight: '1.6' }}>
              <li style={{ marginBottom: '10px' }}>{tr("helpLogin")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpUpload")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpInput")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpSummarize")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpTranslate")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpBullets")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpSave")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpHistory")}</li>
              <li style={{ marginBottom: '10px' }}>{tr("helpProfile")}</li>
            </ol>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setIsHelpOpen(false)}
                style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {tr("helpClose")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* End Help Modal */}
      
      {/* Header (No change) */}
      <header style={{ backgroundColor: 'white', padding: '10px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        {/* ... (Header content remains the same) */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }} aria-label="Go to home">
            <span style={{ marginRight: 5 }}>♦</span>
            <span>NeoSummary</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }} ref={menuRef}>
          {!user ? (
            <>
              <button style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={handleRegisterClick}>Register</button>
              <button style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={handleLoginClick}>Login</button>
              <button style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>👤</button>
            </>
          ) : (
            <>
              <button style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={handleSavedHistory}>
                Summary History
              </button>

              <button
                onClick={() => setMenuOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                style={{ marginLeft: 8, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', border: '1px solid #ddd' }}>👤</div>
                )}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '56px',
                  background: 'white',
                  border: '1px solid #e5e5e5',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                  borderRadius: 8,
                  width: 180,
                  zIndex: 50,
                  overflow: 'hidden'
                }}>
                  <button onClick={goToProfile} style={menuItemStyle}>Profile</button>
                  <button onClick={goToSettings} style={menuItemStyle}>Settings</button>
                  <div style={{ height: 1, background: '#f0f0f0' }} />
                  <button onClick={handleLogout} style={{ ...menuItemStyle, color: '#d9534f' }}>Logout</button>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width: '200px', backgroundColor: '#666', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {/* ... (Sidebar content remains the same) */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setIsHelpOpen(true)}
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#888',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                fontSize: '24px',
                color: 'white'
              }}
              aria-label="Help"
            >
              ?
            </button>
          </div>

          {/* Toggle Options */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span>{tr("translate")}</span>
              <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={translate} 
                  onChange={(e) => setTranslate(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', 
                  cursor: 'pointer', 
                  top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: translate ? '#4CAF50' : '#ccc',
                  borderRadius: '20px',
                  transition: '0.4s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '16px', width: '16px',
                    left: translate ? '22px' : '2px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.4s'
                  }}></span>
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{tr("bullets")}</span>
              <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input
                  type="checkbox"
                  checked={bulletsOn}
                  onChange={(e) => setBulletsOn(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: bulletsOn ? '#4CAF50' : '#ccc',
                  borderRadius: '20px', transition: '0.4s'
                }}>
                  <span style={{
                    position: 'absolute', height: '16px', width: '16px',
                    left: bulletsOn ? '22px' : '2px', bottom: '2px',
                    backgroundColor: 'white', borderRadius: '50%', transition: '0.4s'
                  }}></span>
                </span>
              </label>
            </div>
          </div>

          {/* Language Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#fff' }}>{tr("language")}</label>
            <select
              value={selectedLang ?? ''}
              onChange={(e) => setSelectedLang(e.target.value || null)}
              disabled={!translate} 
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '6px',
                borderRadius: '6px',
                border: '1px solid #e6e6e6',
                fontSize: uiFontSize,
                color: '#000',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                opacity: translate ? 1 : 0.6
              }}
            >
              <option value="">No translation (default)</option>
              {langOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div style={{ color: '#ffffffff', fontSize: 12 }}>
              {selectedLang ? `Output will be in ${langOptions.find(o => o.value === selectedLang)?.label}` : tr("pleaseSelectLanguage")}
            </div>
          </div>

          {/* Upload File Button */}
          <button 
            onClick={() => document.getElementById('fileInput')?.click()}
            disabled={isUploading}
            style={{ 
              padding: '10px', 
              backgroundColor: isUploading ? '#999' : '#555', 
              color: 'white', 
              border: '1px solid #777', 
              borderRadius: '6px', 
              cursor: isUploading ? 'not-allowed' : 'pointer',
              marginTop: 'auto',
              boxShadow: isUploading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)', 
              transition: 'background-color 0.2s, box-shadow 0.2s',
            }}
          >
            {isUploading ? (uiLanguage === "zh" ? "处理中..." : uiLanguage === "ms" ? "Sedang proses..." : "Processing...") : tr("upload")}
          </button>
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', minWidth: 0 }}>
          <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
            {/* Left input*/}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* textarea*/}
                {!highlight ? (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={tr("inputPlaceholder")}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '15px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: `${uiFontSize}px`,
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      resize: 'none',
                      outline: 'none',
                      background: 'white',
                      boxSizing: 'border-box',
                      textAlign: 'justify',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '15px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: `${uiFontSize}px`,
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      background: 'white',
                      boxSizing: 'border-box',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'justify',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightHtml || escapeHtml(inputText || "Input text here") }}
                  />
                )}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', flexShrink: 0 }}>
              <span style={{ fontSize: '24px', color: '#666' }}>›</span>
            </div>

            {/* Right summary box */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
              <div
                style={{
                  flex: 1,
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  fontSize: `${uiFontSize}px`,
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.6',
                  color: displayText ? '#000' : '#999',
                  textAlign: 'justify',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  minHeight: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {bulletsOn ? (
                  bulletsLoading ? (
                    "Converting to bullet points..."
                  ) : bulletsError ? (
                    `Error: ${bulletsError}`
                  ) : bullets.length ? (
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                      {bullets.map((b, i) => (
                        <li key={i} style={{ marginBottom: 6, display: 'flex', gap: 8 }}>
                          <span style={{ display: 'inline-block', width: 14, textAlign: 'center', flexShrink: 0 }}>•</span>
                          <span style={{ flex: 1, wordBreak: 'break-word' }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    displayText ? tr("noBullets") : tr("summaryPlaceholder")
                  )
                ) : (
                  displayText ? (
                    <div dangerouslySetInnerHTML={{ __html: displayText }} />
                  ) : (
                    tr("summaryPlaceholder")
                  )
                )}
              </div>

              {/* Output counts and controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
                {/* Output counts */}
                <div style={{ color: '#999', fontSize: 12 }}>
                  Output: {outputWordCount} words &nbsp; {outputCharCount} chars
                </div>
                
                {/* Compact summary length slider and style selector */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>Style:</span>
                    <select
                      value={summaryStyle}
                      onChange={(e) => setSummaryStyle(e.target.value as 'balanced' | 'priority')}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="balanced">Balanced</option>
                      <option value="priority">Priority-based</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Mode selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#666' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="lengthMode"
                          checked={lengthMode === 'percentage'}
                          onChange={() => setLengthMode('percentage')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>%</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="lengthMode"
                          checked={lengthMode === 'maxWords'}
                          onChange={() => setLengthMode('maxWords')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Words</span>
                      </label>
                    </div>
                    
                    {/* Percentage slider */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10,
                      opacity: lengthMode === 'percentage' ? 1 : 0.4,
                      pointerEvents: lengthMode === 'percentage' ? 'auto' : 'none'
                    }}>
                      <span style={{ fontSize: 12, color: '#666' }}>Length</span>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={summaryLengthPercent}
                        onChange={(e) => setSummaryLengthPercent(Number(e.target.value))}
                        disabled={lengthMode !== 'percentage'}
                        style={{
                          width: 140,
                          height: 4,
                          borderRadius: 4,
                          outline: 'none',
                          background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${((summaryLengthPercent - 20) / 60) * 100}%, #ddd ${((summaryLengthPercent - 20) / 60) * 100}%, #ddd 100%)`,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          cursor: lengthMode === 'percentage' ? 'pointer' : 'not-allowed'
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#333', fontWeight: 700 }}>{summaryLengthPercent}%</span>
                    </div>
                    
                    {/* Max words input */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4,
                      opacity: lengthMode === 'maxWords' ? 1 : 0.4,
                      pointerEvents: lengthMode === 'maxWords' ? 'auto' : 'none'
                    }}>
                      <span style={{ fontSize: 12, color: '#666' }}>Max words</span>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={maxSummaryWords === '' ? '' : maxSummaryWords}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) {
                            setMaxSummaryWords('');
                          } else {
                            const n = Number(v);
                            if (!Number.isNaN(n) && n > 0) {
                              setMaxSummaryWords(n);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (!v) {
                            setMaxSummaryWords('');
                          } else {
                            const n = Number(v);
                            if (!Number.isNaN(n) && n > 0) {
                              const clamped = Math.min(5000, Math.max(1, n));
                              setMaxSummaryWords(clamped);
                            } else {
                              setMaxSummaryWords('');
                            }
                          }
                        }}
                        disabled={lengthMode !== 'maxWords'}
                        placeholder="optional"
                        style={{
                          width: 80,
                          padding: '2px 6px',
                          fontSize: 12,
                          borderRadius: 4,
                          border: '1px solid #ddd',
                          cursor: lengthMode === 'maxWords' ? 'text' : 'not-allowed',
                          backgroundColor: lengthMode === 'maxWords' ? 'white' : '#f5f5f5'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            {/* Left counts - Input */}
                <div style={{ color: '#999', fontSize: 12 }}>
                  Input: {wordCount} words &nbsp; {charCount} chars
            </div>
            {/* Right actions + slider inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Export controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', padding: '6px 10px', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#555' }}>Export:</span>
                <select value={exportKind} onChange={(e) => setExportKind(e.target.value as any)} style={{ fontSize: 12, padding: '4px 6px' }}>
                  <option value="summary">Summary</option>
                  <option value="translated">Translated</option>
                  <option value="bullets">Bullets</option>
                </select>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} style={{ fontSize: 12, padding: '4px 6px' }}>
                  <option value="txt">TXT</option>
                  <option value="doc">DOC</option>
                  <option value="pdf">PDF</option>
                </select>
                <button
                  onClick={handleExport}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Download
                </button>
              </div>
              
              {/* NEW: SAVE BUTTON */}
              {user && originalSummary && (
                <button
                  onClick={handleSaveClick}
                  disabled={hfLoading || isTranslating}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: (hfLoading || isTranslating) ? '#ccc' : '#4CAF50', // Green for save
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (hfLoading || isTranslating) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s'
                  }}
                >
                  Click to Save
                </button>
              )}
              
              {/* NEW: Translate Button */}
              {translate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={translateSource}
                    onChange={(e) => setTranslateSource(e.target.value as any)}
                    style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                  >
                    <option value="summary">Translate summary</option>
                    <option value="original">Translate original</option>
                  </select>
                  <button
                    onClick={() => handleTranslate()}
                    disabled={
                      !selectedLang ||
                      isTranslating ||
                      hfLoading ||
                      (translateSource === "summary" && !originalSummary) ||
                      (translateSource === "original" && !inputText.trim())
                    }
                    style={{
                      padding: '10px 20px',
                      backgroundColor: (
                        !selectedLang ||
                        isTranslating ||
                        hfLoading ||
                        (translateSource === "summary" && !originalSummary) ||
                        (translateSource === "original" && !inputText.trim())
                      ) ? '#999' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (
                        !selectedLang ||
                        isTranslating ||
                        hfLoading ||
                        (translateSource === "summary" && !originalSummary) ||
                        (translateSource === "original" && !inputText.trim())
                      ) ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              )}
              {/* Original Summarize Button */}
              <button
                onClick={handleSummarize}
                disabled={hfLoading || isTranslating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (hfLoading || isTranslating) ? '#999' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (hfLoading || isTranslating) ? 'not-allowed' : 'pointer'
                }}
              >
                {hfLoading ? 'Summarizing...' : 'Summarize'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 'var(--ui-font-size, 14px)'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  width: '400px',
  maxWidth: '90%'
};

export default Index;