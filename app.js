const { DateTime } = luxon;

// State
let state = {
    lang: 'ja',
    baseDate: '',
    baseTime: '',
    baseTimezone: 'Asia/Tokyo',
    duration: 60,
    regions: [
        { id: '1', name: 'ロンドン', tz: 'Europe/London', country: 'GB' },
        { id: '2', name: 'ニューヨーク', tz: 'America/New_York', country: 'US' },
        { id: '3', name: 'ロサンゼルス', tz: 'America/Los_Angeles', country: 'US' }
    ],
    holidays: {} // Cache: { 'US-2026': [ ... ] }
};

const translations = {
    ja: {
        title: 'Global Meeting <span>Coordinator</span>',
        subtitle: '時差・サマータイムを考慮した会議時間の調整と共有',
        dateLabel: '日付',
        timeLabel: '開始時間',
        baseTzLabel: '基準タイムゾーン',
        durationLabel: '期間 (分)',
        participatingRegions: '参加地域',
        addRegion: '地域を追加 +',
        chatOutput: 'Chat用テキスト出力',
        addToCalendar: 'カレンダーに追加',
        copy: 'コピーする',
        copied: 'コピー完了！',
        placeholder: '地域を追加して時間を調整してください...',
        searchPlaceholder: '都市名や国名で検索...',
        cancel: 'キャンセル',
        dayLabel: '日',
        meetingTitle: '【会議時間設定】',
        baseTimeText: '基準時間',
        dayDiffPlus: '+{n}日',
        dayDiffMinus: '-{n}日',
        eventTitle: 'Global Meeting',
        holidayLabel: '祝日'
    },
    en: {
        title: 'Global Meeting <span>Coordinator</span>',
        subtitle: 'Coordinate and share meeting times across time zones.',
        dateLabel: 'Date',
        timeLabel: 'Start Time',
        baseTzLabel: 'Base Timezone',
        durationLabel: 'Duration (min)',
        participatingRegions: 'Participants',
        addRegion: 'Add Region +',
        chatOutput: 'Chat Export',
        addToCalendar: 'Add to Calendar',
        copy: 'Copy Text',
        copied: 'Copied!',
        placeholder: 'Add regions to start coordinating...',
        searchPlaceholder: 'Search city or country...',
        cancel: 'Cancel',
        dayLabel: 'd',
        meetingTitle: '[Meeting Schedule]',
        baseTimeText: 'Base Time',
        dayDiffPlus: '+{n}d',
        dayDiffMinus: '-{n}d',
        eventTitle: 'Global Meeting',
        holidayLabel: 'Holiday'
    }
};

// DOM Elements
const baseDateInput = document.getElementById('base-date');
const baseTimeInput = document.getElementById('base-time');
const baseTzSelect = document.getElementById('base-timezone');
const durationInput = document.getElementById('duration');
const regionsList = document.getElementById('regions-list');
const chatPreview = document.getElementById('chat-preview');
const addRegionBtn = document.getElementById('add-region-btn');
const copyBtn = document.getElementById('copy-btn');
const calendarBtn = document.getElementById('calendar-btn');
const calendarMenu = document.getElementById('calendar-menu');
const regionModal = document.getElementById('region-modal');
const closeModalBtn = document.getElementById('close-modal');
const regionSearchInput = document.getElementById('region-search');
const searchResults = document.getElementById('search-results');

// Initial Setup
function init() {
    // Default to today
    const now = DateTime.now();
    state.baseDate = now.toISODate();
    state.baseTime = now.toFormat('HH:mm');

    baseDateInput.value = state.baseDate;
    baseTimeInput.value = state.baseTime;
    baseTzSelect.value = state.baseTimezone;

    addEventListeners();
    render(); // Render immediately with initial data
    fetchHolidaysForAll(); // Then fetch holidays in background
}

function addEventListeners() {
    baseDateInput.addEventListener('change', (e) => {
        state.baseDate = e.target.value;
        fetchHolidaysForAll();
        render();
    });
    baseTimeInput.addEventListener('change', (e) => {
        state.baseTime = e.target.value;
        render();
    });
    baseTzSelect.addEventListener('change', (e) => {
        state.baseTimezone = e.target.value;
        render();
    });
    durationInput.addEventListener('change', (e) => {
        state.duration = parseInt(e.target.value);
        render();
    });

    addRegionBtn.addEventListener('click', () => {
        regionModal.classList.remove('hidden');
        regionSearchInput.focus();
    });

    closeModalBtn.addEventListener('click', () => {
        regionModal.classList.add('hidden');
    });

    regionSearchInput.addEventListener('input', (e) => {
        searchRegions(e.target.value);
    });

    copyBtn.addEventListener('click', copyToClipboard);

    calendarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calendarMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        calendarMenu.classList.add('hidden');
    });

    document.getElementById('cal-google').addEventListener('click', (e) => {
        e.preventDefault();
        openCalendar('google');
    });
    document.getElementById('cal-outlook').addEventListener('click', (e) => {
        e.preventDefault();
        openCalendar('outlook');
    });
    document.getElementById('cal-ics').addEventListener('click', (e) => {
        e.preventDefault();
        downloadICS();
    });

    document.getElementById('lang-ja').addEventListener('click', () => switchLanguage('ja'));
    document.getElementById('lang-en').addEventListener('click', () => switchLanguage('en'));
}

function switchLanguage(lang) {
    state.lang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');
    updateStaticText();
    render();
}

function updateStaticText() {
    const t = translations[state.lang];
    document.querySelector('.app-header h1').innerHTML = t.title;
    document.querySelector('.app-header p').textContent = t.subtitle;
    document.querySelector('label[for="base-date"]').textContent = t.dateLabel;
    document.querySelector('label[for="base-time"]').textContent = t.timeLabel;
    document.querySelector('label[for="base-timezone"]').textContent = t.baseTzLabel;
    document.querySelector('label[for="duration"]').textContent = t.durationLabel;
    document.querySelector('.section-header h2').textContent = t.participatingRegions;
    addRegionBtn.textContent = t.addRegion;
    document.querySelectorAll('.copy-section h2')[0].textContent = t.chatOutput;
    calendarBtn.innerHTML = `<span class="icon">📅</span> ${t.addToCalendar}`;
    copyBtn.innerHTML = `<span class="icon">📋</span> ${t.copy}`;
    regionSearchInput.placeholder = t.searchPlaceholder;
    closeModalBtn.textContent = t.cancel;
    document.querySelector('.modal-content h3').textContent = t.addRegion.replace(' +', '');
}

function render() {
    const t = translations[state.lang];
    const baseDateTime = DateTime.fromISO(`${state.baseDate}T${state.baseTime}`, { zone: state.baseTimezone });

    // Update Regions List
    regionsList.innerHTML = '';
    state.regions.forEach(region => {
        const regionalTime = baseDateTime.setZone(region.tz);
        const diff = Math.round(regionalTime.startOf('day').diff(baseDateTime.setZone(state.baseTimezone).setZone(region.tz).startOf('day'), 'days').days);
        
        const dateStr = regionalTime.toISODate();
        const year = regionalTime.year;
        const holiday = state.holidays[`${region.country}-${year}`]?.find(h => h.date === dateStr);

        const card = document.createElement('div');
        card.className = 'region-card card glass';
        card.innerHTML = `
            <button class="remove-btn" onclick="removeRegion('${region.id}')">×</button>
            <div class="region-info">
                <span class="region-name">${region.name}</span>
                <span class="region-tz">${region.tz}</span>
            </div>
            <div class="region-time-box">
                <span class="region-time">${regionalTime.toFormat('HH:mm')}</span>
                ${diff !== 0 ? `<span class="day-badge ${diff > 0 ? 'plus' : 'minus'}">${diff > 0 ? t.dayDiffPlus.replace('{n}', diff) : t.dayDiffMinus.replace('{n}', Math.abs(diff))}</span>` : ''}
            </div>
            <div class="region-date">${regionalTime.toFormat('yyyy/MM/dd')}</div>
            ${holiday ? `<div class="holiday-badge"><span class="icon">㊗️</span> ${state.lang === 'ja' ? (holiday.localName || holiday.name) : holiday.name}</div>` : ''}
        `;
        regionsList.appendChild(card);
    });

    // Update Chat Preview
    let previewText = `${t.meetingTitle}\n`;
    previewText += `${t.baseTimeText}: ${state.baseDate} ${state.baseTime} (${state.baseTimezone})\n`;
    previewText += '--------------------------------\n';

    state.regions.forEach(region => {
        const regionalTime = baseDateTime.setZone(region.tz);
        const diff = Math.round(regionalTime.startOf('day').diff(baseDateTime.setZone(state.baseTimezone).setZone(region.tz).startOf('day'), 'days').days);
        const diffText = diff !== 0 ? ` (${diff > 0 ? t.dayDiffPlus.replace('{n}', diff) : t.dayDiffMinus.replace('{n}', Math.abs(diff))})` : '';
        
        const dateStr = regionalTime.toISODate();
        const year = regionalTime.year;
        const holiday = state.holidays[`${region.country}-${year}`]?.find(h => h.date === dateStr);
        const holidayText = holiday ? ` [${state.lang === 'ja' ? (holiday.localName || holiday.name) : holiday.name}]` : '';

        previewText += `${region.name.padEnd(8)}: ${regionalTime.toFormat('yyyy/MM/dd HH:mm')}${diffText}${holidayText}\n`;
    });
    
    chatPreview.textContent = previewText;
}

window.removeRegion = function(id) {
    state.regions = state.regions.filter(r => r.id !== id);
    render();
};

function searchRegions(query) {
    if (!query) {
        renderSearchResults([]);
        return;
    }
    const zones = [
        // Asia
        { name: '東京', nameEn: 'Tokyo', tz: 'Asia/Tokyo', country: 'JP' },
        { name: 'ソウル', nameEn: 'Seoul', tz: 'Asia/Seoul', country: 'KR' },
        { name: 'シンガポール', nameEn: 'Singapore', tz: 'Asia/Singapore', country: 'SG' },
        { name: '上海', nameEn: 'Shanghai', tz: 'Asia/Shanghai', country: 'CN' },
        { name: '香港', nameEn: 'Hong Kong', tz: 'Asia/Hong_Kong', country: 'HK' },
        { name: 'バンコク', nameEn: 'Bangkok', tz: 'Asia/Bangkok', country: 'TH' },
        { name: '台北', nameEn: 'Taipei', tz: 'Asia/Taipei', country: 'TW' },
        { name: 'ドバイ', nameEn: 'Dubai', tz: 'Asia/Dubai', country: 'AE' },
        { name: 'ムンバイ', nameEn: 'Mumbai', tz: 'Asia/Kolkata', country: 'IN' },
        { name: 'ジャカルタ', nameEn: 'Jakarta', tz: 'Asia/Jakarta', country: 'ID' },
        { name: 'マニラ', nameEn: 'Manila', tz: 'Asia/Manila', country: 'PH' },
        { name: 'クアラルンプール', nameEn: 'Kuala Lumpur', tz: 'Asia/Kuala_Lumpur', country: 'MY' },
        { name: 'ホーチミン', nameEn: 'Ho Chi Minh', tz: 'Asia/Ho_Chi_Minh', country: 'VN' },
        // Europe
        { name: 'ロンドン', nameEn: 'London', tz: 'Europe/London', country: 'GB' },
        { name: 'パリ', nameEn: 'Paris', tz: 'Europe/Paris', country: 'FR' },
        { name: 'ベルリン', nameEn: 'Berlin', tz: 'Europe/Berlin', country: 'DE' },
        { name: 'フランクフルト', nameEn: 'Frankfurt', tz: 'Europe/Berlin', country: 'DE' },
        { name: 'ミラノ', nameEn: 'Milan', tz: 'Europe/Rome', country: 'IT' },
        { name: 'マドリード', nameEn: 'Madrid', tz: 'Europe/Madrid', country: 'ES' },
        { name: 'アムステルダム', nameEn: 'Amsterdam', tz: 'Europe/Amsterdam', country: 'NL' },
        { name: 'チューリッヒ', nameEn: 'Zurich', tz: 'Europe/Zurich', country: 'CH' },
        { name: 'ブリュッセル', nameEn: 'Brussels', tz: 'Europe/Brussels', country: 'BE' },
        { name: 'ストックホルム', nameEn: 'Stockholm', tz: 'Europe/Stockholm', country: 'SE' },
        { name: 'ヨーテボリ', nameEn: 'Gothenburg', tz: 'Europe/Stockholm', country: 'SE' },
        { name: 'オスロ', nameEn: 'Oslo', tz: 'Europe/Oslo', country: 'NO' },
        { name: 'ヘルシンキ', nameEn: 'Helsinki', tz: 'Europe/Helsinki', country: 'FI' },
        { name: 'コペンハーゲン', nameEn: 'Copenhagen', tz: 'Europe/Copenhagen', country: 'DK' },
        // North America
        { name: 'ニューヨーク', nameEn: 'New York', tz: 'America/New_York', country: 'US' },
        { name: 'ワシントンDC', nameEn: 'Washington DC', tz: 'America/New_York', country: 'US' },
        { name: 'ロサンゼルス', nameEn: 'Los Angeles', tz: 'America/Los_Angeles', country: 'US' },
        { name: 'サンフランシスコ', nameEn: 'San Francisco', tz: 'America/Los_Angeles', country: 'US' },
        { name: 'シカゴ', nameEn: 'Chicago', tz: 'America/Chicago', country: 'US' },
        { name: 'ダラス', nameEn: 'Dallas', tz: 'America/Chicago', country: 'US' },
        { name: 'ヒューストン', nameEn: 'Houston', tz: 'America/Chicago', country: 'US' },
        { name: 'シアトル', nameEn: 'Seattle', tz: 'America/Los_Angeles', country: 'US' },
        { name: 'デンバー', nameEn: 'Denver', tz: 'America/Denver', country: 'US' },
        { name: 'フェニックス', nameEn: 'Phoenix', tz: 'America/Phoenix', country: 'US' },
        { name: 'ボストン', nameEn: 'Boston', tz: 'America/New_York', country: 'US' },
        { name: 'トロント', nameEn: 'Toronto', tz: 'America/Toronto', country: 'CA' },
        { name: 'バンクーバー', nameEn: 'Vancouver', tz: 'America/Vancouver', country: 'CA' },
        { name: 'メキシコシティ', nameEn: 'Mexico City', tz: 'America/Mexico_City', country: 'MX' },
        // Oceania
        { name: 'シドニー', nameEn: 'Sydney', tz: 'Australia/Sydney', country: 'AU' },
        { name: 'メルボルン', nameEn: 'Melbourne', tz: 'Australia/Melbourne', country: 'AU' },
        { name: 'パース', nameEn: 'Perth', tz: 'Australia/Perth', country: 'AU' },
        { name: 'オークランド', nameEn: 'Auckland', tz: 'Pacific/Auckland', country: 'NZ' },
        // South America
        { name: 'サンパウロ', nameEn: 'Sao Paulo', tz: 'America/Sao_Paulo', country: 'BR' },
        { name: 'サンティアゴ', nameEn: 'Santiago', tz: 'America/Santiago', country: 'CL' },
    ];
    
    const lowerQuery = query.toLowerCase();
    const results = zones.filter(z => 
        z.name.toLowerCase().includes(lowerQuery) || 
        z.tz.toLowerCase().includes(lowerQuery) ||
        (z.nameEn && z.nameEn.toLowerCase().includes(lowerQuery))
    );
    renderSearchResults(results);
}

function renderSearchResults(results) {
    searchResults.innerHTML = '';
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="opacity: 0.5; pointer-events: none;">No results found</div>';
        return;
    }
    
    results.forEach(z => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `<strong>${z.name}</strong> <span style="opacity:0.6; font-size:0.8em">(${z.tz})</span>`;
        div.style.cursor = 'pointer';
        
        div.addEventListener('click', () => {
            addRegion(z);
            regionModal.classList.add('hidden');
            regionSearchInput.value = '';
            searchResults.innerHTML = '';
        });
        searchResults.appendChild(div);
    });
}

function addRegion(regionData) {
    const id = Date.now().toString();
    // Safety check to ensure we have required fields
    if (!regionData || !regionData.tz) return;
    
    state.regions.push({ 
        id, 
        name: regionData.name, 
        tz: regionData.tz, 
        country: regionData.country || 'US' 
    });
    
    render(); // Render immediately
    fetchHolidaysForAll().catch(err => console.error("Holiday fetch failed but continuing:", err));
}

async function copyToClipboard() {
    const text = chatPreview.textContent;
    try {
        await navigator.clipboard.writeText(text);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="icon">✅</span> ' + translations[state.lang].copied;
        copyBtn.style.background = 'var(--success)';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '';
        }, 2000);
    } catch (err) {
        alert('コピーに失敗しました');
    }
}

function openCalendar(service) {
    const baseDateTime = DateTime.fromISO(`${state.baseDate}T${state.baseTime}`, { zone: state.baseTimezone });
    const endDateTime = baseDateTime.plus({ minutes: state.duration });
    const t = translations[state.lang];

    const fmt = (dt) => dt.toFormat("yyyyMMdd'T'HHmmss'Z'");
    const start = fmt(baseDateTime.toUTC());
    const end = fmt(endDateTime.toUTC());
    const title = encodeURIComponent(t.eventTitle);
    const details = encodeURIComponent(chatPreview.textContent);

    let url = '';
    if (service === 'google') {
        url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
    } else if (service === 'outlook') {
        url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${baseDateTime.toISO()}&enddt=${endDateTime.toISO()}&body=${details}`;
    }
    window.open(url, '_blank');
}

function downloadICS() {
    const baseDateTime = DateTime.fromISO(`${state.baseDate}T${state.baseTime}`, { zone: state.baseTimezone });
    const endDateTime = baseDateTime.plus({ minutes: state.duration });
    const t = translations[state.lang];

    const fmt = (dt) => dt.toFormat("yyyyMMdd'T'HHmmss'Z'");
    
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PROID:-//Global Meeting Coordinator//JP',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(baseDateTime.toUTC())}`,
        `DTEND:${fmt(endDateTime.toUTC())}`,
        `SUMMARY:${t.eventTitle}`,
        `DESCRIPTION:${chatPreview.textContent.replace(/\n/g, '\\n')}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'meeting.ics';
    anchor.click();
    window.URL.revokeObjectURL(url);
}

// Start
init();
