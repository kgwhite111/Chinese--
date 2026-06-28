// script.js - 中柯智能翻译核心逻辑

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素获取
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDrawer = document.getElementById('settings-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const cancelSettingsBtn = document.getElementById('cancel-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');

    const settingBaseUrl = document.getElementById('setting-base-url');
    const settingApiKey = document.getElementById('setting-api-key');
    const settingModel = document.getElementById('setting-model');

    const sourceLangLabel = document.getElementById('source-lang-label');
    const targetLangLabel = document.getElementById('target-lang-label');
    const swapLangBtn = document.getElementById('swap-lang-btn');

    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const charCount = document.getElementById('char-count');

    const translateBtn = document.getElementById('translate-btn');
    const translateBtnText = document.getElementById('translate-btn-text');
    const spinnerIcon = translateBtn.querySelector('.spinner-icon');

    const sourceRecordBtn = document.getElementById('source-record-btn');
    const targetRecordBtn = document.getElementById('target-record-btn');
    const sourceSpeakBtn = document.getElementById('source-speak-btn');
    const targetSpeakBtn = document.getElementById('target-speak-btn');

    const toastContainer = document.getElementById('toast-container');

    // 状态管理
    let currentSourceLang = 'zh'; // 'zh' = 中文, 'ky' = 柯尔克孜语
    let currentTargetLang = 'ky'; 

    let isTranslating = false;
    let mediaRecorderSource = null;
    let mediaRecorderTarget = null;
    let audioChunksSource = [];
    let audioChunksTarget = [];
    let streamSource = null;
    let streamTarget = null;

    // --- Toast 提示功能 ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // --- LocalStorage 配置管理 ---
    function loadSettings() {
        const baseUrl = localStorage.getItem('translator_base_url') || 'https://api.deepseek.com/v1';
        const apiKey = localStorage.getItem('translator_api_key') || '';
        const model = localStorage.getItem('translator_model') || 'deepseek-chat';

        settingBaseUrl.value = baseUrl;
        settingApiKey.value = apiKey;
        settingModel.value = model;
    }

    function saveSettings() {
        let baseUrl = settingBaseUrl.value.trim();
        const apiKey = settingApiKey.value.trim();
        const model = settingModel.value.trim();

        if (!baseUrl) {
            showToast('Base URL 不能为空', 'error');
            return;
        }
        if (!model) {
            showToast('大模型名称不能为空', 'error');
            return;
        }

        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        localStorage.setItem('translator_base_url', baseUrl);
        localStorage.setItem('translator_api_key', apiKey);
        localStorage.setItem('translator_model', model);

        showToast('配置已安全保存至本地！', 'success');
        closeDrawer();
    }

    // --- 抽屉面板交互 ---
    function openDrawer() {
        loadSettings();
        settingsDrawer.classList.add('open');
    }

    function closeDrawer() {
        settingsDrawer.classList.remove('open');
    }

    toggleKeyVisibilityBtn.addEventListener('click', () => {
        const type = settingApiKey.getAttribute('type') === 'password' ? 'text' : 'password';
        settingApiKey.setAttribute('type', type);
        
        const svg = toggleKeyVisibilityBtn.querySelector('svg');
        if (type === 'text') {
            svg.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.45 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            svg.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });

    settingsBtn.addEventListener('click', openDrawer);
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    cancelSettingsBtn.addEventListener('click', closeDrawer);
    saveSettingsBtn.addEventListener('click', saveSettings);

    // --- 翻译逻辑与大模型 API 调用 ---
    async function handleTranslate() {
        const text = sourceText.value.trim();
        if (!text) {
            showToast('请输入需要翻译的文本', 'error');
            return;
        }

        const baseUrl = localStorage.getItem('translator_base_url') || 'https://api.deepseek.com/v1';
        const apiKey = localStorage.getItem('translator_api_key') || '';
        const model = localStorage.getItem('translator_model') || 'deepseek-chat';

        if (!apiKey) {
            showToast('请先配置大模型 API Key 密钥', 'error');
            openDrawer();
            return;
        }

        setTranslateLoadingState(true);
        targetText.value = '正在翻译中，请稍候...';

        try {
            const sourceLabel = currentSourceLang === 'zh' ? '中文' : '柯尔克孜语（Kyrgyz/Кыргызча）';
            const targetLabel = currentTargetLang === 'zh' ? '中文' : '柯尔克孜语（Kyrgyz/Кыргызча）';

            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: `你是一个精通中文和柯尔克孜语（Kyrgyz/Кыргызча）的专业同声传译官。请将用户输入的文本精准地翻译为目标语言，不要带有任何多余的解释、引言或标点。直接输出翻译后的结果文本即可。`
                        },
                        {
                            role: 'user',
                            content: `请将以下文本从【${sourceLabel}】精准翻译为【${targetLabel}】，只输出对应的译文：\n\n${text}`
                        }
                    ],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP 错误 ${response.status}`;
                throw new Error(errMsg);
            }

            const data = await response.json();
            const translatedText = data.choices[0].message.content.trim();
            targetText.value = translatedText;
            showToast('翻译完成！', 'success');

        } catch (error) {
            console.error('翻译出错:', error);
            targetText.value = '';
            showToast(`翻译失败: ${error.message}`, 'error');
        } finally {
            setTranslateLoadingState(false);
        }
    }

    function setTranslateLoadingState(loading) {
        isTranslating = loading;
        if (loading) {
            translateBtn.disabled = true;
            translateBtnText.textContent = '翻译中...';
            spinnerIcon.classList.remove('hidden');
        } else {
            translateBtn.disabled = false;
            translateBtnText.textContent = '立即翻译';
            spinnerIcon.classList.add('hidden');
        }
    }

    translateBtn.addEventListener('click', handleTranslate);

    // --- 语言方向切换 ---
    function swapLanguage() {
        const tempLang = currentSourceLang;
        currentSourceLang = currentTargetLang;
        currentTargetLang = tempLang;

        if (currentSourceLang === 'zh') {
            sourceLangLabel.textContent = '中文';
            targetLangLabel.textContent = '柯尔克孜语';
            sourceText.placeholder = '输入要翻译的文本...';
            targetText.placeholder = '翻译结果将显示在这里...';
        } else {
            sourceLangLabel.textContent = '柯尔克孜语';
            targetLangLabel.textContent = '中文';
            sourceText.placeholder = '输入柯尔克孜语文本...';
            targetText.placeholder = '翻译结果将显示在这里...';
        }

        sourceText.value = '';
        targetText.value = '';
        charCount.textContent = '0';
        showToast('语言方向已切换，文本框已清空！');
    }

    swapLangBtn.addEventListener('click', swapLanguage);

    clearTextBtn.addEventListener('click', () => {
        sourceText.value = '';
        charCount.textContent = '0';
        sourceText.focus();
    });

    sourceText.addEventListener('input', () => {
        const count = sourceText.value.length;
        charCount.textContent = count;
        if (count > 2000) {
            sourceText.value = sourceText.value.slice(0, 2000);
            charCount.textContent = '2000';
        }
    });

    // --- 语音录入 ---
    async function toggleRecording(type) {
        const isSource = type === 'source';
        const recordBtn = isSource ? sourceRecordBtn : targetRecordBtn;
        const isRecording = recordBtn.classList.contains('recording');

        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                const chunks = [];

                mediaRecorder.addEventListener('dataavailable', (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                });

                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    console.log(`[语音录制成功] Blob 大小: ${(audioBlob.size / 1024).toFixed(2)} KB`);
                    showToast('录音成功！可接入 Whisper 进行转写。', 'success');
                    stream.getTracks().forEach(track => track.stop());
                });

                if (isSource) {
                    mediaRecorderSource = mediaRecorder;
                    streamSource = stream;
                } else {
                    mediaRecorderTarget = mediaRecorder;
                    streamTarget = stream;
                }

                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.querySelector('.btn-text').textContent = '⏹ 停止录音';
                showToast('正在录音中...', 'info');

            } catch (err) {
                console.error('获取麦克风失败:', err);
                showToast('获取麦克风权限失败', 'error');
            }
        } else {
            if (isSource && mediaRecorderSource) {
                mediaRecorderSource.stop();
                mediaRecorderSource = null;
            } else if (!isSource && mediaRecorderTarget) {
                mediaRecorderTarget.stop();
                mediaRecorderTarget = null;
            }
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('.btn-text').textContent = '🎤 点击录音';
        }
    }

    sourceRecordBtn.addEventListener('click', () => toggleRecording('source'));
    targetRecordBtn.addEventListener('click', () => toggleRecording('target'));

    // --- 文本朗读 ---
    function speakText(text, lang) {
        if (!text) {
            showToast('没有可供朗读的文本', 'error');
            return;
        }

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        if (lang === 'zh') {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            
            const voices = window.speechSynthesis.getVoices();
            const zhVoice = voices.find(v => v.lang.includes('zh-CN') || v.lang.includes('zh_CN'));
            if (zhVoice) utterance.voice = zhVoice;

            utterance.onstart = () => showToast('正在为您朗读中文...', 'success');
            utterance.onerror = (e) => console.error('TTS 朗读错误:', e);

            window.speechSynthesis.speak(utterance);
        } else {
            // 柯尔克孜语朗读 - 通过 Netlify Function 代理
            speakKyrgyzViaProxy(text);
        }
    }
    
    // 通过 Netlify Function 代理 Edge TTS
    async function speakKyrgyzViaProxy(text) {
        showToast('正在为您朗读柯尔克孜语...', 'success');
        
        try {
            const encodedText = encodeURIComponent(text);
            const response = await fetch(`/.netlify/functions/tts-proxy?text=${encodedText}`);
            
            if (!response.ok) {
                throw new Error('TTS 请求失败');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => URL.revokeObjectURL(audioUrl);
            audio.onerror = () => showToast('音频播放失败', 'error');
            
            await audio.play();
            
        } catch (err) {
            console.error('[TTS 错误]', err);
            showToast('柯尔克孜语朗读暂不可用', 'error');
        }
    }

    sourceSpeakBtn.addEventListener('click', () => {
        const text = sourceText.value.trim();
        speakText(text, currentSourceLang);
    });

    targetSpeakBtn.addEventListener('click', () => {
        const text = targetText.value.trim();
        speakText(text, currentTargetLang);
    });

    // 加载语音列表
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {};
    }

    // 默认载入配置
    loadSettings();
});