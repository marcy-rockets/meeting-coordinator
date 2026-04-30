const { DateTime } = luxon;

// State
let state = {
    lang: 'ja',
    baseDate: '',
    baseTime: '',
    baseTimezone: 'Asia/Tokyo',
    duration: 60,
    regions: [
        { id: '1', name: 'ロンドン', tz: 'Europe/London' },
        { id: '2', name: 'ニューヨーク', tz: 'America/New_York' },
        { id: '3', name: 'ロサンゼルス', tz: 'America/Los_Angeles' }
    ]
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
        eventTitle: 'Global Meeting'
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
        eventTitle: 'Global Meeting'
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
    const now = DateTime.now().setZone(state.baseTimezone);
    state.baseDate = now.toISODate();
    state.baseTime = now.toFormat('HH:mm');
    
    baseDateInput.value = state.baseDate;
    baseTimeInput.value = state.baseTime;
    baseTzSelect.value = state.baseTimezone;

    render();
    setupEventListeners();
}

function setupEventListeners() {
    baseDateInput.addEventListener('change', (e) => {
        state.baseDate = e.target.value;
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

// Logic
function calculateTimes() {
    const baseDateTime = DateTime.fromISO(`${state.baseDate}T${state.baseTime}`, { zone: state.baseTimezone });
    
    return state.regions.map(region => {
        const regionalTime = baseDateTime.setZone(region.tz);
        return {
            ...region,
            time: regionalTime.toFormat('HH:mm'),
            date: regionalTime.toFormat('yyyy/MM/dd'),
            offsetName: regionalTime.offsetNameShort, // Shows BST, EDT etc.
            isNextDay: regionalTime.startOf('day') > baseDateTime.setZone(region.tz).startOf('day'),
            isPrevDay: regionalTime.startOf('day') < baseDateTime.setZone(region.tz).startOf('day'),
            // Correct logic for day difference relative to base date
            dayDiff: Math.floor(regionalTime.startOf('day').diff(baseDateTime.setZone(region.tz).startOf('day'), 'days').days)
        };
    });
}

function render() {
    const calculated = calculateTimes();
    renderCards(calculated);
    renderPreview(calculated);
}

function renderCards(data) {
    regionsList.innerHTML = '';
    const t = translations[state.lang];
    data.forEach(region => {
        const card = document.createElement('div');
        card.className = 'region-card glass';
        
        // Calculate day label
        let dayLabel = '';
        const baseDateObj = DateTime.fromISO(state.baseDate);
        const regionDateObj = DateTime.fromISO(region.date.replace(/\//g, '-'));
        const diff = Math.round(regionDateObj.diff(baseDateObj, 'days').days);
        
        if (diff > 0) dayLabel = `<span class="day-badge plus">${t.dayDiffPlus.replace('{n}', diff)}</span>`;
        if (diff < 0) dayLabel = `<span class="day-badge minus">${t.dayDiffMinus.replace('{n}', Math.abs(diff))}</span>`;

        card.innerHTML = `
            <button class="remove-btn" onclick="removeRegion('${region.id}')">×</button>
            <div class="region-info">
                <span class="region-name">${state.lang === 'ja' ? region.name : getEnglishName(region.name)}</span>
                <span class="region-tz">${region.tz} (${region.offsetName})</span>
            </div>
            <div class="region-time-box">
                <div class="region-time">${region.time}</div>
                <div class="region-date">${region.date} ${dayLabel}</div>
            </div>
        `;
        regionsList.appendChild(card);
    });
}

function getEnglishName(jpName) {
    const names = {
        'ロンドン': 'London',
        'ニューヨーク': 'New York',
        'ロサンゼルス': 'Los Angeles',
        '東京': 'Tokyo',
        'シンガポール': 'Singapore',
        '上海': 'Shanghai',
        'シドニー': 'Sydney',
        'パリ': 'Paris',
        'ベルリン': 'Berlin',
        'シカゴ': 'Chicago',
        'サンフランシスコ': 'San Francisco',
        'バンクーバー': 'Vancouver',
        'ドバイ': 'Dubai',
        'ムンバイ': 'Mumbai'
    };
    return names[jpName] || jpName;
}

function renderPreview(data) {
    const t = translations[state.lang];
    let text = `${t.meetingTitle}\n`;
    text += `${t.baseTimeText}: ${state.baseDate} ${state.baseTime} (${state.baseTimezone})\n`;
    text += `--------------------------------\n`;
    
    data.forEach(region => {
        const name = state.lang === 'ja' ? region.name : getEnglishName(region.name);
        text += `${name.padEnd(12)} : ${region.date} ${region.time} (${region.offsetName})\n`;
    });
    
    chatPreview.textContent = text;
}

// Actions
window.removeRegion = function(id) {
    state.regions = state.regions.filter(r => r.id !== id);
    render();
};

function searchRegions(query) {
    if (!query) {
        searchResults.innerHTML = '';
        return;
    }
    
    // Simple mock database for demo - In real app, could use a full list of TZs
    const commonZones = [
        { name: '東京', tz: 'Asia/Tokyo' },
        { name: 'シンガポール', tz: 'Asia/Singapore' },
        { name: '上海', tz: 'Asia/Shanghai' },
        { name: 'シドニー', tz: 'Australia/Sydney' },
        { name: 'ロンドン', tz: 'Europe/London' },
        { name: 'パリ', tz: 'Europe/Paris' },
        { name: 'ベルリン', tz: 'Europe/Berlin' },
        { name: 'ニューヨーク', tz: 'America/New_York' },
        { name: 'シカゴ', tz: 'America/Chicago' },
        { name: 'サンフランシスコ', tz: 'America/Los_Angeles' },
        { name: 'バンクーバー', tz: 'America/Vancouver' },
        { name: 'ドバイ', tz: 'Asia/Dubai' },
        { name: 'ムンバイ', tz: 'Asia/Kolkata' }
    ];

    const filtered = commonZones.filter(z => 
        z.name.includes(query) || z.tz.toLowerCase().includes(query.toLowerCase())
    );

    searchResults.innerHTML = '';
    filtered.forEach(z => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = `${z.name} (${z.tz})`;
        div.onclick = () => {
            addRegion(z.name, z.tz);
            regionModal.classList.add('hidden');
            regionSearchInput.value = '';
            searchResults.innerHTML = '';
        };
        searchResults.appendChild(div);
    });
}

function addRegion(name, tz) {
    const id = Date.now().toString();
    state.regions.push({ id, name, tz });
    render();
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
