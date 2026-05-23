// ========== GEMINI AI ==========
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

let conversationHistory = [];

function buildSystemPrompt(char, eraId, yearBE) {
    const eraPeriods = {
        sukho:  'พ.ศ. 1792–1981 (อาณาจักรสุโขทัย)',
        ayu:    'พ.ศ. 1893–2310 (กรุงศรีอยุธยา)',
        thon:   'พ.ศ. 2310–2325 (กรุงธนบุรี)',
        ratana: 'พ.ศ. 2325–ปัจจุบัน (กรุงรัตนโกสินทร์)'
    };
    const charStyles = {
        s1: 'ใช้ภาษาโบราณสุโขทัย เรียกตัวเองว่า "ข้า" เรียกผู้อื่นว่า "ท่าน" หรือ "หลานเจ้า" มีความเป็นพ่อปกครองลูก',
        s2: 'พูดภาษาชาวบ้านสุโขทัย เป็นกันเอง เรียกผู้อื่นว่า "พ่อหนุ่ม" หรือ "แม่สาว" บางทีพูดสำเนียงเหนือเล็กน้อย',
        a1: 'ใช้ภาษาราชสำนักอยุธยา เรียกตัวเองว่า "ข้า" เรียกผู้อื่นว่า "เจ้า" น้ำเสียงมั่นใจและเด็ดเดี่ยวเหมือนแม่ทัพ',
        a2: 'ผสมภาษาไทยกับคำฝรั่งเศสหรืออังกฤษบ้าง เป็นกันเองแบบขุนนางยุโรป มักพูดเรื่องการค้าและการทูต',
        t1: 'ภาษาชาวบ้านธนบุรี เรียกผู้อื่นว่า "ออเจ้า" น้ำเสียงเหนื่อยล้าแต่ฮึกเหิม พูดเรื่องสงครามและการกู้ชาติ',
        r1: 'พูดจาเป็นกวี ใช้คำสละสลวย บางครั้งสัมผัสคล้องจอง เรียกตัวเองว่า "ข้า" แนะนำตัวว่า "สุนทรภู่"',
        r2: 'ภาษาชาวบ้านกรุงเทพฯ ยุค ร.4–ร.5 เป็นกันเอง เรียกผู้อื่นว่า "จ๊ะ" หรือ "นะคะ" พูดเรื่องชีวิตริมคลอง'
    };

    const king = getCurrentKing(yearBE);
    const kingLine = king
        ? `พระมหากษัตริย์ที่ครองราชย์: ${king.name_th} (ค.ศ. ${king.reign_start}–${king.reign_end}) — ${king.notable}`
        : '';

    const nearEvents = APP_DATA.historicalEvents
        .filter(e => e.era === eraId && Math.abs(e.year_be - yearBE) <= 60)
        .sort((a, b) => Math.abs(a.year_be - yearBE) - Math.abs(b.year_be - yearBE))
        .slice(0, 3)
        .map(e => `• ${e.title} (พ.ศ. ${e.year_be}): ${e.desc}`)
        .join('\n');

    const isKing = char.id && char.id.startsWith('king_');
    const charIntro = isKing && king
        ? `คุณคือ ${king.name_th} (${king.name_en}) กษัตริย์แห่งยุค${APP_DATA.database[eraId]?.name || eraId} ราชวงศ์${king.dynasty} — ${king.notable}`
        : `คุณคือ ${char.name} ทำหน้าที่: ${char.role}`;

    const style = charStyles[char.id] || `ใช้ภาษาไทยที่เหมาะกับยุค${APP_DATA.database[eraId]?.name || eraId} เรียกตัวเองว่า "ข้า"`;

    return `${charIntro}
ยุคสมัย: ${eraPeriods[eraId] || eraId}
ปีในเรื่อง: พ.ศ. ${yearBE} (ค.ศ. ${yearBE - 543})
${kingLine}

เหตุการณ์ประวัติศาสตร์ใกล้เคียงที่คุณรู้จัก:
${nearEvents || 'ช่วงเวลาปกติ ไม่มีเหตุการณ์พิเศษ'}

===กฎการสนทนา===
1. สวมบทบาทเป็น ${char.name} อย่างสมจริงตลอดเวลา ห้ามออกนอกบทบาท
2. ${style}
3. ตอบเป็นภาษาไทยเสมอ ให้ข้อมูลประวัติศาสตร์ที่ถูกต้องตามยุคสมัย
4. ถ้าถามเรื่องที่เกินยุคสมัย ให้บอกว่าไม่รู้หรือตอบในฐานะคนในยุคนั้น
5. ตอบกระชับ 2–4 ประโยค เว้นแต่คำถามต้องการรายละเอียด
6. ห้ามพูดว่า "ในฐานะ AI" หรือออกนอกบทบาทโดยเด็ดขาด`;
}

async function callGeminiAPI(userMessage, char, eraId, yearBE) {
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    const payload = {
        system_instruction: { parts: [{ text: buildSystemPrompt(char, eraId, yearBE) }] },
        contents: conversationHistory,
        generationConfig: { temperature: 0.85, maxOutputTokens: 1024 }
    };
    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'ขออภัย ไม่สามารถตอบได้';
    conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
    if (conversationHistory.length > 20) conversationHistory.splice(0, 2);
    return reply;
}

// ========== LEAFLET MAP ==========
let leafletMap, kingdomLayer, markerGroup, legendControl, labelGroup;

function initMap() {
    leafletMap = L.map('leaflet-map', {
        center: [13.5, 101.5],
        zoom: 6,
        scrollWheelZoom: true,
        attributionControl: false,
        zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 14,
        opacity: 0.88
    }).addTo(leafletMap);

    L.control.attribution({ prefix: false })
        .addAttribution('© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>')
        .addTo(leafletMap);

    L.polyline(THAILAND_OUTLINE, { color: '#888', weight: 1.5, opacity: 0.5, dashArray: '4,4' }).addTo(leafletMap);

    updateMap('ayu');
}

function updateMap(eraId) {
    if (!leafletMap) return;
    const data = eraMapData[eraId];
    if (!data) return;

    if (kingdomLayer) { leafletMap.removeLayer(kingdomLayer); kingdomLayer = null; }
    if (markerGroup)  { leafletMap.removeLayer(markerGroup);  markerGroup  = null; }
    if (labelGroup)   { leafletMap.removeLayer(labelGroup);   labelGroup   = null; }
    if (legendControl) leafletMap.removeControl(legendControl);

    const mainK = data.kingdoms.find(k => k.main) || data.kingdoms[0];

    kingdomLayer = L.layerGroup();
    data.kingdoms.forEach(k => {
        L.polygon(k.polygon, {
            color: k.color, weight: 1.5,
            fillColor: k.fillColor, fillOpacity: k.fillOpacity
        }).bindTooltip(k.name, { permanent: false, direction: 'center', className: 'kingdom-tooltip' })
          .addTo(kingdomLayer);
    });
    kingdomLayer.addTo(leafletMap);

    markerGroup = L.layerGroup();
    data.cities.forEach(c => {
        const icon = L.divIcon({
            className: '',
            html: `<div class="map-city-dot${c.capital ? ' capital' : ''}"></div>`,
            iconSize: [10, 10], iconAnchor: [5, 5]
        });
        L.marker([c.lat, c.lng], { icon })
         .bindTooltip(c.name, { permanent: false, direction: 'top', className: 'city-tooltip' })
         .addTo(markerGroup);
    });
    markerGroup.addTo(leafletMap);

    legendControl = L.control({ position: 'bottomleft' });
    legendControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'era-legend');
        div.style.borderLeft = `4px solid ${mainK.color}`;
        div.innerHTML = `<span style="color:${mainK.color};">■</span> ${data.name}<br><span style="font-size:0.62rem;color:#555;font-weight:400;">${data.period || ''}</span>`;
        return div;
    };
    legendControl.addTo(leafletMap);

    leafletMap.flyTo(data.center, data.zoom, { duration: 0.8 });
}

// Modern Thailand boundary — used as a permanent geographic reference
const THAILAND_OUTLINE = APP_DATA.THAILAND_OUTLINE;
const eraMapData = APP_DATA.eraMapData;
const eraInfo = APP_DATA.eraInfo;
const historicalEvents = APP_DATA.historicalEvents;
const worldEvents = APP_DATA.worldEvents;
const ERA_CURRENCY = APP_DATA.ERA_CURRENCY;
const ARTIFACTS = APP_DATA.ARTIFACTS;

function getNearestEvents(yearBE, eraId) {
    const evs = historicalEvents.filter(e => e.era === eraId);
    const past = evs.filter(e => e.year_be <= yearBE).sort((a,b) => b.year_be - a.year_be)[0] || null;
    const next = evs.filter(e => e.year_be > yearBE).sort((a,b) => a.year_be - b.year_be)[0] || null;
    return { past, next };
}

function getNearestWorldEvents(yearBE) {
    const past = worldEvents.filter(e => e.year_be <= yearBE).sort((a,b) => b.year_be - a.year_be).slice(0,2);
    return past;
}

// ========== ARTIFACTS & CULTURE ==========
function renderEraInfo(eraId, yearBE) {
    const info = eraInfo[eraId];
    if (!info) return;
    const king = yearBE ? getCurrentKing(yearBE) : null;
    const kingBadge = king
        ? `<div class="era-info-badge" title="${king.notable}"><span class="label">กษัตริย์&nbsp;</span><span class="value">${king.name_th}</span></div>
           <div class="era-info-badge"><span class="label">ราชวงศ์&nbsp;</span><span class="value">${king.dynasty}</span></div>`
        : '';
    document.getElementById('era-quick-info').innerHTML = `
        <div class="era-info-badge"><span class="label">ช่วงเวลา&nbsp;</span><span class="value">${info.period}</span></div>
        <div class="era-info-badge"><span class="label">ราชธานี&nbsp;</span><span class="value">${info.capital}</span></div>
        ${kingBadge}
        ${info.highlights.slice(0,1).map(h => `<div class="era-highlight-item">${h}</div>`).join('')}
    `;

    // ── Update floating era info box ──
    const color = eraPillColors[eraId] || '#8B1A1A';
    const eraName = eraMapData[eraId] ? eraMapData[eraId].name : (database[eraId] ? database[eraId].name : '');

    // Header
    document.getElementById('efb-dot').style.background = color;
    document.getElementById('efb-era-badge').style.background = color;
    document.getElementById('efb-era-name').textContent = eraName;
    document.getElementById('efb-era-name').style.color = color;
    document.getElementById('era-float-box').style.borderColor = `rgba(${hexToRgb(color)}, 0.4)`;

    // Section 1 — era overview
    document.getElementById('efb-period').textContent = info.period;
    document.getElementById('efb-capital').textContent = info.capital;
    document.getElementById('efb-duration').textContent = info.duration;
    document.getElementById('efb-era-highlight').innerHTML =
        info.highlights.slice(0, 1).map(h => `<div class="efb-highlight-row">${h}</div>`).join('');

    // Section 2 — year specific
    document.getElementById('efb-year-tag').textContent = `พ.ศ. ${yearBE}`;

    // King (reuse king from above)
    document.getElementById('efb-king-area').innerHTML = king ? `
        <div class="efb-king-card">
            <div class="efb-king-name">${king.name_th}</div>
            <div class="efb-king-meta">${king.dynasty} · ค.ศ. ${king.reign_start}–${king.reign_end}</div>
            <div class="efb-king-notable">${king.notable}</div>
        </div>` : `<div class="efb-empty">ไม่พบข้อมูลพระมหากษัตริย์</div>`;

    // Events
    const { past, next } = getNearestEvents(yearBE, eraId);
    let evHtml = '';
    if (past) evHtml += `
        <div class="efb-event-card">
            <div class="efb-event-year">${past.emoji} พ.ศ. ${past.year_be}${past.year_be === yearBE ? ' · ปีนี้' : ' · เกิดขึ้นแล้ว'}</div>
            <div class="efb-event-title">${past.title}</div>
            <div class="efb-event-desc">${past.desc}</div>
        </div>`;
    if (next) evHtml += `
        <div class="efb-event-card efb-event-upcoming">
            <div class="efb-event-year">⏳ พ.ศ. ${next.year_be} · อีก ${next.year_be - yearBE} ปี</div>
            <div class="efb-event-title">${next.title}</div>
            <div class="efb-event-desc">${next.desc}</div>
        </div>`;
    if (!past && !next) evHtml = `<div class="efb-empty">ไม่มีเหตุการณ์บันทึก</div>`;
    document.getElementById('efb-events-area').innerHTML = evHtml;

    // Section 3 — world comparison
    const worldEvs = getNearestWorldEvents(yearBE);
    document.getElementById('efb-world-area').innerHTML = worldEvs.length
        ? worldEvs.map(e => `
            <div class="efb-world-card">
                <div class="efb-world-country">${e.country} · พ.ศ. ${e.year_be}</div>
                <div class="efb-world-title">${e.title}</div>
                <div class="efb-world-desc">${e.desc}</div>
            </div>`).join('')
        : `<div class="efb-empty">ไม่มีข้อมูลเหตุการณ์โลก</div>`;

}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
}

// ── ERA BOX TOGGLE ──
let eraBoxOpen = true;
function toggleEraBox() {
    eraBoxOpen = !eraBoxOpen;
    const box = document.getElementById('era-float-box');
    const btn = document.getElementById('efb-toggle-btn');
    if (eraBoxOpen) {
        box.classList.remove('collapsed');
        btn.style.display = 'none';
    } else {
        box.classList.add('collapsed');
        btn.style.display = 'flex';
    }
}

// ── SIDEBAR RESIZE ──
(function() {
    const handle = document.getElementById('sidebar-resize-handle');
    const sidebar = document.querySelector('.right-sidebar');
    const timelineBar = document.querySelector('.timeline-bar');
    const MIN_W = 260, MAX_W = 560;
    let dragging = false, startX = 0, startW = 0;

    function positionHandle() {
        const w = sidebar.offsetWidth;
        handle.style.right = w + 'px';
    }

    function setWidth(w) {
        w = Math.max(MIN_W, Math.min(MAX_W, w));
        sidebar.style.width = w + 'px';
        document.documentElement.style.setProperty('--sidebar-w', w + 'px');
        timelineBar.style.right = w + 'px';
        positionHandle();
    }

    handle.addEventListener('mousedown', e => {
        dragging = true;
        startX = e.clientX;
        startW = sidebar.offsetWidth;
        handle.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const delta = startX - e.clientX;
        setWidth(startW + delta);
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    });

    window.addEventListener('resize', positionHandle);
    positionHandle();
})();

// ========== KINGS DATA ==========
const kingsData = APP_DATA.kingsData;

function getCurrentKing(yearBE) {
    const yearCE = yearBE - 543;
    return kingsData.find(k => yearCE >= k.reign_start && yearCE <= k.reign_end) || null;
}

function kingToCharacter(king) {
    const eraAvatars = { 'สุโขทัย': '👑', 'อยุธยา': '⚔️', 'ธนบุรี': '🏹', 'รัตนโกสินทร์': '📜' };
    const eraKeys = { 'สุโขทัย': 'sukho', 'อยุธยา': 'ayu', 'ธนบุรี': 'thon', 'รัตนโกสินทร์': 'ratana' };
    const greetingByEra = {
        'สุโขทัย':      `เจริญพร ข้าคือ${king.name_th} ${king.notable} มีเรื่องใดอยากรู้เกี่ยวกับรัชสมัยของข้า?`,
        'อยุธยา':       `ข้าคือ${king.name_th} แห่ง${king.dynasty} — ${king.notable} จะถามเรื่องใด?`,
        'ธนบุรี':       `ข้าตากสินมหาราช ${king.notable} เจ้ามาหาข้าด้วยเรื่องอันใด?`,
        'รัตนโกสินทร์': `ข้าคือ${king.name_th} ${king.notable} ยินดีตอบทุกคำถามเกี่ยวกับรัชกาลของข้า`
    };
    return {
        id: `king_${king.id}`,
        name: king.name_th,
        role: `${king.dynasty} · ค.ศ. ${king.reign_start}–${king.reign_end}`,
        avatar: eraAvatars[king.era] || '👑',
        era: eraKeys[king.era] || 'sukho',
        greeting: greetingByEra[king.era] || `ข้าคือ${king.name_th} มีเรื่องใดจะถาม?`,
        keywords: [
            `${king.name_th}ทรงทำอะไรที่สำคัญที่สุด?`,
            `เหตุการณ์ใดเกิดขึ้นในรัชกาลนี้?`,
            `ราชวงศ์${king.dynasty}มีความสำคัญอย่างไร?`,
            `บ้านเมืองในยุค ค.ศ. ${king.reign_start} เป็นอย่างไร?`
        ]
    };
}

// ========== PREMIUM ILLUSTRATED AVATARS (SVG) ==========
const AVATAR_SVGS = {
    // User / Explorer Avatar
    user: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgUser" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1A252C"/>
            <stop offset="100%" stop-color="#0A1015"/>
          </linearGradient>
          <linearGradient id="compassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00D2FF"/>
            <stop offset="100%" stop-color="#0066FF"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgUser)" stroke="#00D2FF" stroke-width="2" filter="drop-shadow(0 0 4px rgba(0,210,255,0.4))"/>
        <circle cx="50" cy="50" r="30" stroke="rgba(0,210,255,0.15)" stroke-width="1" fill="none"/>
        <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(0,210,255,0.15)" stroke-width="1"/>
        <line x1="15" y1="50" x2="85" y2="50" stroke="rgba(0,210,255,0.15)" stroke-width="1"/>
        <path d="M30 80 C30 68, 38 63, 50 63 C62 63, 70 68, 70 80 Z" fill="#EAECEE"/>
        <path d="M43 63 L50 71 L57 63 Z" fill="#FFD54F"/>
        <circle cx="50" cy="48" r="15" fill="#EAECEE"/>
        <path d="M26 38 L50 28 L74 38 L50 48 Z" fill="#34495E"/>
        <rect x="42" y="43" width="16" height="6" fill="#2C3E50"/>
        <path d="M70 38 L70 54 L68 54 L68 38" fill="#FFD54F"/>
        <path d="M78 22 L80 14 L82 22 L90 24 L82 26 L80 34 L78 26 L70 24 Z" fill="url(#compassGrad)"/>
    </svg>`,
    
    // Father Ramkhamhaeng (s1)
    s1: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgS1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#B8860B"/>
            <stop offset="100%" stop-color="#556B2F"/>
          </linearGradient>
          <linearGradient id="goldS1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFE79A"/>
            <stop offset="100%" stop-color="#D4AF37"/>
          </linearGradient>
          <linearGradient id="stoneS1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E0E0E0"/>
            <stop offset="100%" stop-color="#757575"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgS1)" stroke="#FFE79A" stroke-width="2"/>
        <path d="M35 80 L35 45 Q35 35 50 35 Q65 35 65 45 L65 80 Z" fill="url(#stoneS1)" opacity="0.6"/>
        <line x1="42" y1="48" x2="58" y2="48" stroke="#333333" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="40" y1="56" x2="60" y2="56" stroke="#333333" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="42" y1="64" x2="58" y2="64" stroke="#333333" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M25 72 L32 40 L45 52 L50 25 L55 52 L68 40 L75 72 Z" fill="url(#goldS1)" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.5))"/>
        <rect x="28" y="67" width="44" height="6" rx="3" fill="#D4AF37" stroke="#8B6508" stroke-width="1"/>
    </svg>`,
    
    // Yai Sa (s2)
    s2: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgS2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E28743"/>
            <stop offset="100%" stop-color="#76300D"/>
          </linearGradient>
          <linearGradient id="skinS2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCD5A3"/>
            <stop offset="100%" stop-color="#E0AC69"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgS2)" stroke="#FCD5A3" stroke-width="2"/>
        <circle cx="50" cy="30" r="14" fill="#5A5A5A"/>
        <circle cx="50" cy="18" r="8" fill="#5A5A5A"/>
        <line x1="58" y1="12" x2="42" y2="24" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/>
        <path d="M42 75 L42 60 L58 60 L58 75 Z" fill="url(#skinS2)"/>
        <circle cx="50" cy="45" r="17" fill="url(#skinS2)"/>
        <path d="M40 45 Q44 49 48 45" stroke="#4A3B32" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M52 45 Q56 49 60 45" stroke="#4A3B32" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M44 53 Q50 59 56 53" stroke="#B22222" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M30 80 C30 70, 38 65, 50 65 C62 65, 70 70, 70 80 Z" fill="#D2B48C"/>
        <path d="M40 65 L50 78 L60 65 Z" fill="url(#skinS2)"/>
    </svg>`,
    
    // King Naresuan (a1)
    a1: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgA1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#800000"/>
            <stop offset="100%" stop-color="#3A0000"/>
          </linearGradient>
          <linearGradient id="helmetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#D4AF37"/>
            <stop offset="50%" stop-color="#A67C1E"/>
            <stop offset="100%" stop-color="#5B4010"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgA1)" stroke="#D4AF37" stroke-width="2"/>
        <path d="M25 80 C25 65, 35 60, 50 60 C65 60, 75 65, 75 80 Z" fill="#424242" stroke="#D4AF37" stroke-width="1.5"/>
        <path d="M40 60 L50 70 L60 60 Z" fill="#FFE0B2"/>
        <circle cx="50" cy="48" r="15" fill="#FFE0B2"/>
        <path d="M33 42 C33 22, 67 22, 67 42 Z" fill="url(#helmetGrad)"/>
        <path d="M48 24 L52 24 L50 8 Z" fill="url(#helmetGrad)"/>
        <path d="M33 42 L67 42 L50 48 Z" fill="url(#helmetGrad)"/>
        <path d="M12 25 L88 77" stroke="#E0E0E0" stroke-width="4" stroke-linecap="round"/>
        <path d="M8 22 L15 28" stroke="#D4AF37" stroke-width="6" stroke-linecap="round"/>
        <line x1="42" y1="47" x2="47" y2="46" stroke="#212121" stroke-width="2"/>
        <line x1="53" y1="46" x2="58" y2="47" stroke="#212121" stroke-width="2"/>
        <path d="M45 54 Q50 56 55 54" stroke="#212121" stroke-width="2" fill="none"/>
    </svg>`,
    
    // Constantine Phaulkon (a2)
    a2: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgA2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0E6251"/>
            <stop offset="100%" stop-color="#0B3C33"/>
          </linearGradient>
          <linearGradient id="hairA2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F5B041"/>
            <stop offset="100%" stop-color="#D35400"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgA2)" stroke="#76D7C4" stroke-width="2"/>
        <circle cx="34" cy="44" r="10" fill="url(#hairA2)"/>
        <circle cx="66" cy="44" r="10" fill="url(#hairA2)"/>
        <circle cx="32" cy="54" r="11" fill="url(#hairA2)"/>
        <circle cx="68" cy="54" r="11" fill="url(#hairA2)"/>
        <path d="M44 70 L44 58 L56 58 L56 70 Z" fill="#FDF2E9"/>
        <circle cx="50" cy="44" r="16" fill="#FDF2E9"/>
        <circle cx="50" cy="30" r="12" fill="url(#hairA2)"/>
        <circle cx="40" cy="32" r="10" fill="url(#hairA2)"/>
        <circle cx="60" cy="32" r="10" fill="url(#hairA2)"/>
        <path d="M30 75 Q40 68 50 75 Q60 68 70 75 L70 82 L30 82 Z" fill="#FFFFFF"/>
        <path d="M34 77 L50 82 L66 77" stroke="#E5E7E9" stroke-width="1.5" fill="none"/>
        <path d="M28 80 C28 75, 32 78, 50 78 C68 78, 72 75, 72 80 Z" fill="#2471A3"/>
        <circle cx="44" cy="44" r="1.5" fill="#2C3E50"/>
        <circle cx="56" cy="44" r="1.5" fill="#2C3E50"/>
        <path d="M43 49 C45 49 48 47 50 49 C52 47 55 49 57 49" stroke="#9A7D0A" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M47 53 Q50 55 53 53" stroke="#2C3E50" stroke-width="1" fill="none"/>
    </svg>`,
    
    // Soldier (t1)
    t1: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgT1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#145A32"/>
            <stop offset="100%" stop-color="#0B301A"/>
          </linearGradient>
          <linearGradient id="skinT1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E2AF80"/>
            <stop offset="100%" stop-color="#C58B58"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgT1)" stroke="#52BE80" stroke-width="2"/>
        <path d="M15 75 L85 25" stroke="#BDC3C7" stroke-width="3" stroke-linecap="round"/>
        <path d="M85 75 L15 25" stroke="#BDC3C7" stroke-width="3" stroke-linecap="round"/>
        <circle cx="15" cy="75" r="3" fill="#D4AF37"/>
        <circle cx="85" cy="75" r="3" fill="#D4AF37"/>
        <path d="M28 80 C28 68, 38 64, 50 64 C62 64, 72 68, 72 80 Z" fill="#873A5C" stroke="#D4AF37" stroke-width="1"/>
        <path d="M42 64 L50 72 L58 64 Z" fill="url(#skinT1)"/>
        <circle cx="50" cy="49" r="15" fill="url(#skinT1)"/>
        <path d="M35 44 C35 30, 65 30, 65 44 Z" fill="#5D4037" stroke="#D4AF37" stroke-width="1"/>
        <rect x="33" y="42" width="34" height="4" fill="#D4AF37"/>
        <line x1="50" y1="30" x2="50" y2="24" stroke="#D4AF37" stroke-width="2"/>
        <circle cx="50" cy="22" r="2" fill="#D4AF37"/>
        <path d="M38 52 C38 60 62 60 62 52" stroke="#2D1A12" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="44" cy="46" r="1.5" fill="#2D1A12"/>
        <circle cx="56" cy="46" r="1.5" fill="#2D1A12"/>
    </svg>`,
    
    // Sunthorn Phu (r1)
    r1: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgR1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4A235A"/>
            <stop offset="100%" stop-color="#24142C"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgR1)" stroke="#C39BD3" stroke-width="2"/>
        <path d="M68 62 L82 50 C85 47, 85 42, 82 39 L75 32" stroke="#F5F5DC" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path d="M26 80 C26 68, 36 63, 50 63 C64 63, 74 68, 74 80 Z" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1"/>
        <path d="M42 63 L50 71 L58 63 Z" fill="#FFD54F"/>
        <path d="M26 80 L50 63 L74 80 Z" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="50" cy="46" r="16" fill="#FFE082"/>
        <path d="M34 40 C34 25, 66 25, 66 40 L62 38 C62 30, 38 30, 38 38 Z" fill="#1A1A1A"/>
        <path d="M34 40 C34 32, 66 32, 66 40 Z" fill="#1A1A1A"/>
        <path d="M41 45 Q44 43 47 45" stroke="#3E2723" stroke-width="2" fill="none"/>
        <path d="M53 45 Q56 43 59 45" stroke="#3E2723" stroke-width="2" fill="none"/>
        <path d="M45 50 Q50 49 55 50" stroke="#3E2723" stroke-width="1.5" fill="none"/>
        <path d="M46 54 Q50 57 54 54" stroke="#D32F2F" stroke-width="2" fill="none"/>
    </svg>`,
    
    // Canal Merchant (r2)
    r2: `<svg viewBox="0 0 100 100" class="svg-avatar">
        <defs>
          <linearGradient id="bgR2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78281F"/>
            <stop offset="100%" stop-color="#4A120E"/>
          </linearGradient>
          <linearGradient id="strawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E5C158"/>
            <stop offset="100%" stop-color="#A07810"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bgR2)" stroke="#F1948A" stroke-width="2"/>
        <path d="M15 72 L85 72 C75 80, 25 80, 15 72 Z" fill="#5D4037" stroke="#3E2723" stroke-width="1.5"/>
        <line x1="72" y1="45" x2="88" y2="82" stroke="#8D6E63" stroke-width="3" stroke-linecap="round"/>
        <path d="M30 72 C30 65, 38 60, 50 60 C62 60, 70 65, 70 72 Z" fill="#1C2833"/>
        <path d="M42 60 L50 68 L58 60 Z" fill="#FADBD8"/>
        <circle cx="50" cy="46" r="14" fill="#FADBD8"/>
        <path d="M22 42 Q50 20 78 42 Z" fill="url(#strawGrad)" stroke="#7E5109" stroke-width="1"/>
        <line x1="50" y1="20" x2="50" y2="42" stroke="#7E5109" stroke-width="1" opacity="0.3"/>
        <line x1="36" y1="31" x2="64" y2="31" stroke="#7E5109" stroke-width="1" opacity="0.3"/>
        <circle cx="44" cy="46" r="1.5" fill="#4A120E"/>
        <circle cx="56" cy="46" r="1.5" fill="#4A120E"/>
        <path d="M46 51 Q50 55 54 51" stroke="#E06666" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
};

function getKingSVG(era) {
    let stop1 = '#8B1A1A';
    let stop2 = '#3D0B0B';
    let stroke = '#D4AF37';
    if (era === 'sukho') {
        stop1 = '#8B6914';
        stop2 = '#3D2F09';
        stroke = '#FFE79A';
    } else if (era === 'thon') {
        stop1 = '#4A1A7A';
        stop2 = '#1D0B3D';
        stroke = '#E2B4FF';
    } else if (era === 'ratana') {
        stop1 = '#1A4A8A';
        stop2 = '#0B1E3D';
        stroke = '#B4D2FF';
    }
    return `
    <svg viewBox="0 0 100 100" class="svg-avatar">
      <defs>
        <radialGradient id="kingGrad-${era || 'default'}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFF099"/>
          <stop offset="70%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#8B6914"/>
        </radialGradient>
        <linearGradient id="bgKing-${era || 'default'}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${stop1}"/>
          <stop offset="100%" stop-color="${stop2}"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bgKing-${era || 'default'})" stroke="${stroke}" stroke-width="2"/>
      <path d="M20 70 L25 45 L40 55 L50 30 L60 55 L75 45 L80 70 Z" fill="url(#kingGrad-${era || 'default'})" filter="drop-shadow(0px 3px 3px rgba(0,0,0,0.4))"/>
      <rect x="25" y="66" width="50" height="6" rx="3" fill="#B22222"/>
      <circle cx="50" cy="30" r="4" fill="#FF4500"/>
      <circle cx="25" cy="45" r="3" fill="#FF4500"/>
      <circle cx="75" cy="45" r="3" fill="#FF4500"/>
      <circle cx="40" cy="55" r="3" fill="#FF4500"/>
      <circle cx="60" cy="55" r="3" fill="#FF4500"/>
      <circle cx="35" cy="69" r="2" fill="#FFFFFF"/>
      <circle cx="50" cy="69" r="2" fill="#FFFFFF"/>
      <circle cx="65" cy="69" r="2" fill="#FFFFFF"/>
    </svg>
    `;
}

function getAvatarSVG(char) {
    if (!char) return '';
    const id = char.id || '';
    const avatar = char.avatar || '';
    const era = char.era || '';
    
    if (id === 's1') return AVATAR_SVGS.s1;
    if (id === 's2') return AVATAR_SVGS.s2;
    if (id === 'a1') return AVATAR_SVGS.a1;
    if (id === 'a2') return AVATAR_SVGS.a2;
    if (id === 't1') return AVATAR_SVGS.t1;
    if (id === 'r1') return AVATAR_SVGS.r1;
    if (id === 'r2') return AVATAR_SVGS.r2;
    
    if (id.toString().startsWith('king_') || avatar === '👑') {
        return getKingSVG(era);
    }
    
    if (avatar === '👵') return AVATAR_SVGS.s2;
    if (avatar === '⚔️') return AVATAR_SVGS.a1;
    if (avatar === '🧑‍✈️') return AVATAR_SVGS.a2;
    if (avatar === '🏹') return AVATAR_SVGS.t1;
    if (avatar === '📜') return AVATAR_SVGS.r1;
    if (avatar === '🛶') return AVATAR_SVGS.r2;
    if (avatar === '🎓') return AVATAR_SVGS.user;
    
    return `<div class="fallback-emoji-avatar">${avatar}</div>`;
}

function getUserAvatarSVG() {
    return AVATAR_SVGS.user;
}

// ========== ERA DATA ==========

const database = APP_DATA.database;

// ========== USER PROFILE & ACHIEVEMENTS ==========
const ACHIEVEMENTS = APP_DATA.ACHIEVEMENTS;

const LEVELS = APP_DATA.LEVELS;

function defaultProfile() {
    return { name: 'นักสำรวจ', xp: 0, totalMessages: 0, totalChats: 0,
             chatWithKing: false, erasVisited: [], erasSlid: [],
             charsChattedEras: [], unlockedAchievements: [], chatHistory: [],
             wallet: { sukho: 200, ayu: 200, thon: 100, ratana: 150 },
             collection: [] };
}

function loadProfile() {
    try {
        const raw = localStorage.getItem('histalk_profile');
        if (raw) {
            const p = JSON.parse(raw);
            if (!p.wallet) p.wallet = { sukho: 200, ayu: 200, thon: 100, ratana: 150 };
            if (!p.collection) p.collection = [];
            return p;
        }
    } catch(e) {}
    return defaultProfile();
}

function saveProfile() {
    localStorage.setItem('histalk_profile', JSON.stringify(userProfile));
}

let userProfile = loadProfile();

function getLevelInfo(xp) {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) { if (xp >= LEVELS[i].min) idx = i; }
    const nextMin = LEVELS[idx + 1] ? LEVELS[idx + 1].min : LEVELS[idx].min + 1000;
    const prevMin = LEVELS[idx].min;
    const pct = Math.min(Math.round(((xp - prevMin) / (nextMin - prevMin)) * 100), 100);
    return { level: idx + 1, label: LEVELS[idx].label, nextXp: nextMin, progress: pct };
}

function checkAchievements() {
    const p = userProfile;
    const conditions = {
        first_msg:   p.totalMessages >= 1,
        first_king:  p.chatWithKing,
        era_2:       (p.erasVisited || []).length >= 2,
        era_all:     (p.erasVisited || []).length >= 4,
        msg_10:      p.totalMessages >= 10,
        msg_50:      p.totalMessages >= 50,
        all_eras_ch: (p.charsChattedEras || []).length >= 4,
        map_all:     (p.erasSlid || []).length >= 4,
        buy_1:       (p.collection || []).length >= 1,
        buy_5:       (p.collection || []).length >= 5,
    };
    ACHIEVEMENTS.forEach(ach => {
        if (!p.unlockedAchievements.includes(ach.id) && conditions[ach.id]) {
            p.unlockedAchievements.push(ach.id);
            p.xp += ach.xp;
            saveProfile();
            showAchievementToast(ach);
        }
    });
}

function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-toast');
    toast.innerHTML = `${ach.emoji} ปลดล็อก: <b>${ach.name}</b>&nbsp;<span style="color:var(--primary);">+${ach.xp} XP</span>`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function addToSet(arr, val) {
    if (!arr.includes(val)) arr.push(val);
}

function trackChatStart(char, era) {
    userProfile.totalChats++;
    addToSet(userProfile.erasVisited, era);
    addToSet(userProfile.charsChattedEras, era);
    if (char.id && char.id.startsWith('king_')) userProfile.chatWithKing = true;
    const existing = userProfile.chatHistory.find(h => h.charId === (char.id || char.name) && h.era === era);
    if (existing) {
        existing.lastDate = new Date().toLocaleDateString('th-TH');
    } else {
        userProfile.chatHistory.unshift({
            charId: char.id || char.name, charName: char.name,
            charAvatar: char.avatar, era,
            eraName: database[era] ? database[era].name : era,
            msgCount: 0, lastDate: new Date().toLocaleDateString('th-TH')
        });
        if (userProfile.chatHistory.length > 20) userProfile.chatHistory.pop();
    }
    saveProfile();
    checkAchievements();
}

function trackMessage(text, role) {
    userProfile.totalMessages++;
    if (userProfile.chatHistory.length > 0) {
        userProfile.chatHistory[0].msgCount++;
        if (text) {
            if (!userProfile.chatHistory[0].messages) userProfile.chatHistory[0].messages = [];
            userProfile.chatHistory[0].messages.push({ role: role || 'user', text });
            if (userProfile.chatHistory[0].messages.length > 10) userProfile.chatHistory[0].messages.shift();
        }
    }
    if (!userProfile.wallet) userProfile.wallet = { sukho: 0, ayu: 0, thon: 0, ratana: 0 };
    userProfile.wallet[currentEra] = (userProfile.wallet[currentEra] || 0) + 15;
    saveProfile();
    checkAchievements();
}

function trackSlider(era) {
    const isNew = !(userProfile.erasSlid || []).includes(era);
    addToSet(userProfile.erasSlid, era);
    if (isNew) {
        if (!userProfile.wallet) userProfile.wallet = { sukho: 0, ayu: 0, thon: 0, ratana: 0 };
        userProfile.wallet[era] = (userProfile.wallet[era] || 0) + 20;
    }
    saveProfile();
    checkAchievements();
}

// ── MUSEUM PAGE ──
let museumFilter = 'all';
let museumTab = 'collection';

function switchMuseumTab(tab) {
    museumTab = tab;
    document.getElementById('m-tab-collection').classList.toggle('active', tab === 'collection');
    document.getElementById('m-tab-shop').classList.toggle('active', tab === 'shop');
    const filterRow = document.getElementById('museum-era-filter');
    if (filterRow) filterRow.style.display = tab === 'shop' ? 'flex' : 'none';
    renderMuseumContent();
}

function setMuseumFilter(era) {
    museumFilter = era;
    document.querySelectorAll('.era-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.era === era));
    renderMuseumContent();
}

function renderMuseumPage() {
    const wallet = userProfile.wallet || {};
    document.getElementById('museum-wallet').innerHTML =
        Object.entries(ERA_CURRENCY).map(([eId, cur]) =>
            `<div class="era-wallet-chip" style="border-color:${cur.color}40;">
                <span>${cur.symbol}</span>
                <span style="color:${cur.color};font-size:0.7rem;">${(wallet[eId]||0).toLocaleString()}</span>
                <span class="price-currency">${cur.name}</span>
            </div>`
        ).join('');

    const eraOptions = [['all','ทั้งหมด'], ...Object.entries(ERA_CURRENCY).map(([eId]) => [eId, database[eId].name])];
    const filterEl = document.getElementById('museum-era-filter');
    filterEl.innerHTML = eraOptions.map(([eId, label]) => {
        const isActive = museumFilter === eId;
        const cur = ERA_CURRENCY[eId];
        const activeStyle = isActive && cur ? `background:${cur.color};border-color:${cur.color};color:white;` : '';
        const baseActive = isActive && !cur ? 'active' : '';
        return `<button class="era-filter-btn ${baseActive}" data-era="${eId}" style="${activeStyle}" onclick="setMuseumFilter('${eId}')">${label}</button>`;
    }).join('');
    filterEl.style.display = museumTab === 'shop' ? 'flex' : 'none';

    renderMuseumContent();
}

function renderMuseumContent() {
    const content = document.getElementById('museum-content');
    const collection = userProfile.collection || [];
    const rarityLabels = { common:'ธรรมดา', uncommon:'หายาก', rare:'หายากมาก', legendary:'ตำนาน', mythic:'ศักดิ์สิทธิ์' };

    if (museumTab === 'collection') {
        const ownedSet = new Set(collection);
        const count = collection.length;
        const total = ARTIFACTS.length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const cards = ARTIFACTS.map(art => {
            if (ownedSet.has(art.id)) {
                return `<div class="showcase-case rarity-${art.rarity}" title="${art.desc}">
                    <div class="showcase-spotlight"></div>
                    <span class="showcase-icon">${art.emoji}</span>
                    <div class="showcase-name">${art.name}</div>
                    <div class="showcase-plate">
                        <div class="showcase-era-label">${art.eraName}</div>
                    </div>
                </div>`;
            } else {
                return `<div class="showcase-case locked" title="${art.name} — ยังไม่ได้รับ">
                    <span class="showcase-icon">${art.emoji}</span>
                    <div class="showcase-name">${art.name}</div>
                    <div class="showcase-plate">
                        <div class="locked-label">🔒 ยังไม่ได้รับ</div>
                    </div>
                </div>`;
            }
        }).join('');
        content.innerHTML = `
            <div class="showcase-progress">
                <div class="showcase-count-block">
                    <div class="showcase-count">${count}</div>
                    <div class="showcase-count-sub">/ ${total} ชิ้น</div>
                </div>
                <div class="showcase-prog-wrap">
                    <div class="showcase-prog-label">
                        <span>ความคืบหน้าคอลเลคชัน</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="showcase-prog-track">
                        <div class="showcase-prog-fill" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>
            <div class="showcase-grid">${cards}</div>`;
        return;
    }

    const filtered = museumFilter === 'all' ? ARTIFACTS : ARTIFACTS.filter(a => a.era === museumFilter);
    const wallet = userProfile.wallet || {};
    content.innerHTML = filtered.map(art => {
        const owned = collection.includes(art.id);
        const cur = ERA_CURRENCY[art.era];
        const balance = wallet[art.era] || 0;
        const canAfford = balance >= art.price;
        return `
        <div class="artifact-card rarity-${art.rarity}${owned?' owned':''}">
            <div class="rarity-bar ${art.rarity}"></div>
            <div class="artifact-header">
                <div class="artifact-icon">${art.emoji}</div>
                <div class="artifact-info">
                    <div class="artifact-name">${art.name}</div>
                    <span class="artifact-era-tag">${art.eraName} · ${art.year}</span>
                    <span class="rarity-tag ${art.rarity}">${rarityLabels[art.rarity]||art.rarity}</span>
                </div>
            </div>
            <p class="artifact-desc">${art.desc}</p>
            <div class="artifact-footer">
                <div class="artifact-price">
                    <span>${cur.symbol}</span>
                    <span>${art.price.toLocaleString()}</span>
                    <span class="price-currency">${cur.name}</span>
                    ${!owned ? `<span class="price-currency">&nbsp;(มี ${balance.toLocaleString()})</span>` : ''}
                </div>
                ${owned
                    ? `<div class="owned-badge">✓ เป็นเจ้าของแล้ว</div>`
                    : `<button class="buy-btn${canAfford?'':' insufficient'}" onclick="buyArtifact('${art.id}')"${canAfford?'':' disabled'}>${canAfford?'ซื้อ':'เงินไม่พอ'}</button>`
                }
            </div>
        </div>`;
    }).join('');
}

function buyArtifact(artId) {
    const art = ARTIFACTS.find(a => a.id === artId);
    if (!art) return;
    if (!userProfile.wallet) userProfile.wallet = { sukho: 0, ayu: 0, thon: 0, ratana: 0 };
    if (!userProfile.collection) userProfile.collection = [];
    const balance = userProfile.wallet[art.era] || 0;
    if (balance < art.price || userProfile.collection.includes(artId)) return;
    userProfile.wallet[art.era] -= art.price;
    userProfile.collection.push(artId);
    userProfile.xp += 30;
    saveProfile();
    showAchievementToast({ emoji: art.emoji, name: `ได้รับ: ${art.name}`, xp: 30 });
    checkAchievements();
    renderMuseumPage();
}

// ── PAGE NAVIGATION ──
let chatPanelWasVisible = false;

function showPage(page) {
    // Hide all content panes
    document.getElementById('char-selection-view').style.display = 'none';
    document.getElementById('chat-panel').style.display = 'none';
    document.getElementById('museum-page').style.display = 'none';
    document.getElementById('user-page').style.display = 'none';

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    if (page === 'chat') {
        document.getElementById('nav-chat').classList.add('active');
        if (chatPanelWasVisible) {
            document.getElementById('chat-panel').style.display = 'flex';
        } else {
            document.getElementById('char-selection-view').style.display = 'flex';
        }
    } else if (page === 'museum') {
        document.getElementById('nav-museum').classList.add('active');
        document.getElementById('museum-page').style.display = 'flex';
        renderMuseumPage();
    } else if (page === 'profile') {
        document.getElementById('nav-profile').classList.add('active');
        document.getElementById('user-page').style.display = 'flex';
        renderUserPage();
    }
    lucide.createIcons();
}

function renderUserPage() {
    const lvl = getLevelInfo(userProfile.xp);
    document.getElementById('up-name').textContent = userProfile.name;
    document.getElementById('up-level-label').textContent = `ระดับ ${lvl.level} · ${lvl.label}`;
    document.getElementById('up-xp-label').textContent = `${userProfile.xp} / ${lvl.nextXp} XP`;
    document.getElementById('up-xp-fill').style.width = lvl.progress + '%';
    document.getElementById('up-stat-msgs').textContent = userProfile.totalMessages;
    document.getElementById('up-stat-eras').textContent = (userProfile.erasVisited || []).length;
    document.getElementById('up-stat-chats').textContent = userProfile.totalChats;

    
    const hist = userProfile.chatHistory || [];
    document.getElementById('history-list').innerHTML = hist.length === 0
        ? `<div class="empty-state"><span class="es-icon">💬</span>ยังไม่มีประวัติการสนทนา<br>เลือกตัวละครและเริ่มคุยได้เลย!</div>`
        : hist.map(h => `
            <div class="history-item">
                <div class="history-avatar">${getAvatarSVG({ id: h.charId, avatar: h.charAvatar, era: h.era })}</div>
                <div class="history-info">
                    <div class="hi-name">${h.charName}</div>
                    <div class="hi-meta">ยุค${h.eraName} · ${h.lastDate}</div>
                </div>
                <div class="hi-count">${h.msgCount} msg</div>
            </div>`).join('');

}

let currentEra = 'ayu';
let currentCharacter = database.ayu.characters[0];
let currentKingChar = null;
let isCallMode = false;

const eraPillColors = { sukho: '#8B6914', ayu: '#8B1A1A', thon: '#4A1A7A', ratana: '#1A4A8A' };
const eraPillEmoji = { sukho: '👑', ayu: '⚔️', thon: '🏹', ratana: '📜' };

function getEraForYear(year) {
    if (year < 1893) return 'sukho';
    if (year < 2310) return 'ayu';
    if (year < 2325) return 'thon';
    return 'ratana';
}

function handleSliderChange(year) {
    year = parseInt(year);
    const eraId = getEraForYear(year);
    const prevEra = currentEra;
    currentEra = eraId;
    trackSlider(eraId);

    // อัปเดตปีที่แสดง
    document.getElementById('year-display').innerText = `พ.ศ. ${year}`;
    document.getElementById('year-ce').innerText = `ค.ศ. ${year - 543}`;

    // อัปเดต era pill
    const pill = document.getElementById('era-pill');
    pill.style.background = eraPillColors[eraId];
    pill.innerText = `${eraPillEmoji[eraId]} ยุค${database[eraId].name}`;

    // ไฮไลต์ยุคที่ active บน color bar
    document.querySelectorAll('.era-bar-seg').forEach(s => s.classList.remove('active'));
    document.getElementById(`era-seg-${eraId}`).classList.add('active');

    updateMap(eraId);
    renderEraInfo(eraId, year);

    const newKing = getCurrentKing(year);
    const newKingChar = newKing ? kingToCharacter(newKing) : null;
    const kingChanged = newKingChar?.id !== currentKingChar?.id;
    currentKingChar = newKingChar;

    if (eraId !== prevEra) {
        renderCharacterList();
        showCharacterSelection();
    } else if (kingChanged) {
        renderCharacterList(); // silently refresh the card list
    }
}

function jumpToYear(year) {
    document.getElementById('era-range-slider').value = year;
    handleSliderChange(year);
}

function showCharacterSelection() {
    if (isCallMode) toggleCallMode();
    chatPanelWasVisible = false;
    document.getElementById('selection-era-name').innerText = database[currentEra].name;
    showPage('chat');
}

function renderCharacterList() {
    const grid = document.getElementById('char-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const chars = currentKingChar
        ? [currentKingChar, ...database[currentEra].characters]
        : database[currentEra].characters;
    chars.forEach((char, i) => {
        if (!char.era) char.era = currentEra;
        const isKingCard = i === 0 && !!currentKingChar;
        const btn = document.createElement('button');
        btn.className = `char-card${isKingCard ? ' king-card' : ''}`;
        btn.onclick = () => selectCharacter(char);
        const notable = isKingCard && char.kingData
            ? char.kingData.notable
            : (char.keywords ? char.keywords[0] : '');
        btn.innerHTML = `
            <div class="char-card-avatar">${getAvatarSVG(char)}</div>
            <div class="char-card-info">
                <h4>${char.name}</h4>
                <p class="role">${char.role}</p>
                ${notable ? `<p class="notable">${notable}</p>` : ''}
            </div>
        `;
        grid.appendChild(btn);
    });
    document.getElementById('selection-era-name').innerText = database[currentEra].name;
}

function selectCharacter(char) {
    if (!char.era) char.era = currentEra;
    currentCharacter = char;
    conversationHistory = [];
    trackChatStart(char, currentEra);

    // Switch to chat panel
    chatPanelWasVisible = true;
    showPage('chat');

    document.getElementById('header-avatar').innerHTML = getAvatarSVG(char);
    document.getElementById('header-name').innerText = char.name;
    document.getElementById('header-subtitle').innerText = `สวมบทบาทโดย HisTalk AI • ยุค${database[currentEra].name}`;
    document.getElementById('call-avatar-emoji').innerHTML = getAvatarSVG(char);
    document.getElementById('call-target-name').innerText = char.name;

    const chatView = document.getElementById('chat-view');
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} น.`;
    const chipsHtml = char.keywords && char.keywords.length ? `
        <div class="keyword-chips">
            <span class="chips-label">ลองถามเกี่ยวกับ:</span>
            ${char.keywords.map(kw => `<button class="keyword-chip" onclick="askKeyword('${kw}')">${kw}</button>`).join('')}
        </div>` : '';
    chatView.innerHTML = `
        <div class="msg-row bot-row">
            <div class="msg-avatar">${getAvatarSVG(char)}</div>
            <div class="msg-bubble-wrapper">
                <div class="msg-bubble bot">
                    <p>${char.greeting}</p>
                    <span class="msg-time">${timeStr}</span>
                </div>
            </div>
        </div>
        ${chipsHtml}
    `;
}

function askKeyword(text) {
    const chips = document.querySelector('.keyword-chips');
    if (chips) chips.style.display = 'none';
    sendMessage(text);
}

function toggleCallMode() {
    isCallMode = !isCallMode;
    const chatView = document.getElementById('chat-view');
    const callView = document.getElementById('call-view');
    const footer = document.getElementById('panel-footer');
    const callBtn = document.getElementById('call-btn');

    if (isCallMode) {
        chatView.style.display = 'none'; callView.style.display = 'flex'; footer.style.display = 'none';
        callBtn.classList.add('in-call'); document.getElementById('call-btn-text').innerText = 'วางสายจำลอง';
    } else {
        chatView.style.display = 'flex'; callView.style.display = 'none'; footer.style.display = 'block';
        callBtn.classList.remove('in-call'); document.getElementById('call-btn-text').innerText = 'โทรคุยด้วยเสียง';
    }
}

async function sendMessage(overrideText) {
    const input = document.getElementById('chat-input');
    const text = overrideText || input.value.trim();
    if (!text) return;
    input.value = '';

    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.disabled = true;

    trackMessage(text, 'user');

    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} น.`;
    const chatView = document.getElementById('chat-view');

    const userRow = document.createElement('div');
    userRow.className = 'msg-row user-row';
    userRow.innerHTML = `
        <div class="msg-bubble-wrapper">
            <div class="msg-bubble user">
                <p>${text}</p>
                <span class="msg-time">${ts}</span>
            </div>
        </div>
        <div class="msg-avatar">${getUserAvatarSVG()}</div>
    `;
    chatView.appendChild(userRow);

    const body = document.getElementById('interaction-body');
    body.scrollTop = body.scrollHeight;

    if (!currentCharacter.era) currentCharacter.era = currentEra;
    const typingId = 'typing-' + Date.now();
    const typingRow = document.createElement('div');
    typingRow.className = 'msg-row bot-row';
    typingRow.id = typingId;
    typingRow.innerHTML = `
        <div class="msg-avatar">${getAvatarSVG(currentCharacter)}</div>
        <div class="msg-bubble-wrapper">
            <div class="msg-bubble bot typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatView.appendChild(typingRow);
    body.scrollTop = body.scrollHeight;

    const yearBE = parseInt(document.getElementById('era-range-slider').value) || 1893;

    try {
        const botReply = await callGeminiAPI(text, currentCharacter, currentEra, yearBE);
        document.getElementById(typingId)?.remove();

        const now2 = new Date();
        const ts2 = `${now2.getHours().toString().padStart(2,'0')}:${now2.getMinutes().toString().padStart(2,'0')} น.`;
        const botRow = document.createElement('div');
        botRow.className = 'msg-row bot-row';
        botRow.innerHTML = `
            <div class="msg-avatar">${getAvatarSVG(currentCharacter)}</div>
            <div class="msg-bubble-wrapper">
                <div class="msg-bubble bot">
                    <p>${botReply.replace(/\n/g, '<br>')}</p>
                    <span class="msg-time">${ts2}</span>
                </div>
            </div>
        `;
        chatView.appendChild(botRow);
        body.scrollTop = body.scrollHeight;

        if (userProfile.chatHistory.length > 0) {
            if (!userProfile.chatHistory[0].messages) userProfile.chatHistory[0].messages = [];
            userProfile.chatHistory[0].messages.push({ role: 'bot', text: botReply });
            if (userProfile.chatHistory[0].messages.length > 10) userProfile.chatHistory[0].messages.shift();
            saveProfile();
        }
    } catch (err) {
        document.getElementById(typingId)?.remove();
        const errRow = document.createElement('div');
        errRow.className = 'msg-row bot-row';
        errRow.innerHTML = `
            <div class="msg-avatar">${getAvatarSVG(currentCharacter)}</div>
            <div class="msg-bubble-wrapper">
                <div class="msg-bubble bot" style="color:#c0392b;">
                    <p>⚠️ ไม่สามารถเชื่อมต่อ AI ได้: ${err.message}</p>
                </div>
            </div>
        `;
        chatView.appendChild(errRow);
        body.scrollTop = body.scrollHeight;
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

window.onload = () => {
    lucide.createIcons();
    initMap();
    handleSliderChange(1893);
    renderCharacterList();
    showCharacterSelection();
    document.getElementById('up-avatar').innerHTML = getUserAvatarSVG();
};
