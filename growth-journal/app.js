// Supabase Client Initialization
const { createClient } = supabase;
const supabaseUrl = 'https://iunzzneyarkjdmyyodfb.supabase.co';
const supabaseKey = 'sb_publishable_dnWZP0esqw-S4bnqElKOoQ_D2qMryFX';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Data Models
const CATEGORIES = [
    { id: 'reading', label: '📖 독서' },
    { id: 'exercise', label: '💪 운동' },
    { id: 'study', label: '✍️ 공부' }
];

let journalData = {};

// Helpers
function getDateString(d) {
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().split('T')[0];
    return localISOTime;
}

let todayStr = getDateString(new Date());

function initializeTodayData() {
    if (!journalData[todayStr]) {
        journalData[todayStr] = {
            reading: { status: 'none', note: '' },
            exercise: { status: 'none', note: '' },
            study: { status: 'none', note: '' }
        };
    }
}

// Load from Supabase Database
async function loadDataFromSupabase() {
    // Basic loading feedback
    document.getElementById('save-record-btn').textContent = '데이터 로딩 중...';
    document.getElementById('save-record-btn').disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('daily_records')
            .select('*');
            
        if (error) throw error;

        journalData = {};
        if (data) {
            data.forEach(row => {
                const dateStr = row.record_date;
                journalData[dateStr] = {
                    reading: { status: row.reading_status || 'none', note: row.reading_note || '' },
                    exercise: { status: row.exercise_status || 'none', note: row.exercise_note || '' },
                    study: { status: row.study_status || 'none', note: row.study_note || '' }
                };
            });
        }
    } catch (err) {
        console.error('Error fetching data from Supabase:', err);
    } finally {
        initializeTodayData();
        
        // Reset UI
        document.getElementById('save-record-btn').textContent = '저장하기';
        document.getElementById('save-record-btn').disabled = false;
        
        renderRecordUI();
        renderDashboard();
        
        // If history view is active, update it
        if(document.getElementById('history').classList.contains('active')) {
            renderHistory();
        }
    }
}

// Save to Supabase Database
async function saveData() {
    const btn = document.getElementById('save-record-btn');
    const originalText = btn.textContent;
    btn.textContent = '클라우드에 저장 중... ☁️';
    btn.disabled = true;

    const todayData = journalData[todayStr];
    
    // Map our object to the Supabase SQL schema
    const upsertData = {
        record_date: todayStr,
        reading_status: todayData.reading.status,
        reading_note: todayData.reading.note || '',
        exercise_status: todayData.exercise.status,
        exercise_note: todayData.exercise.note || '',
        study_status: todayData.study.status,
        study_note: todayData.study.note || ''
    };

    try {
        const { error } = await supabaseClient
            .from('daily_records')
            .upsert(upsertData, { onConflict: 'record_date' });

        if (error) throw error;

        btn.textContent = '저장 성공! ✓';
        btn.style.background = 'var(--success-color)';
    } catch (err) {
        console.error('Error saving data to Supabase:', err);
        btn.textContent = '저장 실패 ❌';
        btn.style.background = 'var(--fail-color)';
    } finally {
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    }
}

// Navigation Logic
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const targetId = e.target.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        if(targetId === 'dashboard') renderDashboard();
        if(targetId === 'history') renderHistory();
    });
});

// Render Record Cards (Today's Record UI)
function renderRecordUI() {
    const container = document.getElementById('record-cards');
    container.innerHTML = '';
    const todayData = journalData[todayStr] || {
        reading: { status: 'none', note: '' },
        exercise: { status: 'none', note: '' },
        study: { status: 'none', note: '' }
    };

    CATEGORIES.forEach(cat => {
        const catData = todayData[cat.id];
        const card = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML = `
            <div class="record-header">
                <h3>${cat.label}</h3>
                <div class="status-btns">
                    <button class="status-btn success ${catData.status === 'success' ? 'active' : ''}" data-cat="${cat.id}" data-type="success">성공</button>
                    <button class="status-btn fail ${catData.status === 'fail' ? 'active' : ''}" data-cat="${cat.id}" data-type="fail">실패</button>
                    <button class="status-btn none ${catData.status === 'none' ? 'active' : ''}" data-cat="${cat.id}" data-type="none">미기록</button>
                </div>
            </div>
            <textarea class="record-note ${(catData.status === 'success' || catData.status === 'fail') ? 'active' : ''}" data-cat="${cat.id}" placeholder="${catData.status === 'success' ? '무엇을 배우고 느꼈나요?' : '왜 실패했는지 원인을 분석해보세요.'}">${catData.note || ''}</textarea>
        `;
        container.appendChild(card);
    });

    // Event Listeners for Record UI
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = e.target.getAttribute('data-cat');
            const statusType = e.target.getAttribute('data-type');
            
            journalData[todayStr][catId].status = statusType;
            
            // Update UI Details
            const card = e.target.closest('.record-card');
            card.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const textarea = card.querySelector('textarea');
            if (statusType === 'none') {
                textarea.classList.remove('active');
                journalData[todayStr][catId].note = '';
                textarea.value = '';
            } else {
                textarea.classList.add('active');
                textarea.placeholder = statusType === 'success' ? '무엇을 배우고 느꼈나요?' : '왜 실패했는지 원인을 분석해보세요.';
            }
        });
    });

    document.querySelectorAll('textarea.record-note').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const catId = e.target.getAttribute('data-cat');
            journalData[todayStr][catId].note = e.target.value;
        });
    });
}

document.getElementById('save-record-btn').addEventListener('click', () => {
    saveData();
});

// Dashboard Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const tabId = e.target.getAttribute('data-tab');
        document.querySelectorAll('.stat-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`stat-${tabId}`).classList.add('active');
    });
});

function renderDashboard() {
    document.getElementById('today-date-display').innerHTML = `<strong>${todayStr}</strong> 의 멋진 하루`;
    
    const today = new Date();
    
    // 1. Weekly Stats (Last 7 days including today)
    let weeklyCounts = { reading: 0, exercise: 0, study: 0 };
    for(let i=0; i<7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = getDateString(d);
        if(journalData[ds]) {
            if(journalData[ds].reading.status === 'success') weeklyCounts.reading++;
            if(journalData[ds].exercise.status === 'success') weeklyCounts.exercise++;
            if(journalData[ds].study.status === 'success') weeklyCounts.study++;
        }
    }

    CATEGORIES.forEach(cat => {
        const percent = Math.round((weeklyCounts[cat.id] / 7) * 100);
        
        // Trigger reflow for animation
        const bar = document.getElementById(`weekly-${cat.id}-bar`);
        if (bar) {
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = `${percent}%`; }, 100);
            document.getElementById(`weekly-${cat.id}-text`).textContent = `최근 7일 중 ${weeklyCounts[cat.id]}일 성공 (${percent}%)`;
        }
    });

    // 2. Monthly Calendar
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const calendarMonthYear = document.getElementById('calendar-month-year');
    if(calendarMonthYear) calendarMonthYear.textContent = `${currentYear}년 ${currentMonth + 1}월`;
    
    const firstDayStr = new Date(currentYear, currentMonth, 1);
    const firstDay = firstDayStr.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const calGrid = document.getElementById('calendar-grid');
    if (calGrid) {
        calGrid.innerHTML = '';
        
        // Add Days of week header
        const daysEn = ['일','월','화','수','목','금','토'];
        daysEn.forEach(d => {
            calGrid.innerHTML += `<div class="cal-day empty" style="font-weight:700; color:var(--text-primary); font-size:0.8rem;">${d}</div>`;
        });
        
        // Empty cells before start of month
        for(let i=0; i<firstDay; i++) {
            calGrid.innerHTML += `<div class="cal-day empty"></div>`;
        }
        
        for(let i=1; i<=daysInMonth; i++) {
            const d = new Date(currentYear, currentMonth, i);
            const ds = getDateString(d);
            let successCount = 0;
            let failCount = 0;
            
            if(journalData[ds]) {
                CATEGORIES.forEach(cat => {
                    if(journalData[ds][cat.id].status === 'success') successCount++;
                    if(journalData[ds][cat.id].status === 'fail') failCount++;
                });
            }
            
            let cls = '';
            if(successCount === 3) cls = 'success';
            else if(failCount > 0) cls = 'fail';
            else if(successCount > 0) cls = 'partial';
            
            const isToday = ds === todayStr;
            const outerStyle = isToday ? 'border: 2px solid var(--primary-color); font-weight: bold; color: white;' : '';
            
            calGrid.innerHTML += `<div class="cal-day ${cls}" style="${outerStyle}">${i}</div>`;
        }
    }

    // 3. Yearly Heatmap (Last 365 Days)
    const heatmapGrid = document.getElementById('heatmap-grid');
    if (heatmapGrid) {
        heatmapGrid.innerHTML = '';
        
        const heatStart = new Date(today);
        heatStart.setDate(today.getDate() - 364);
        
        for(let i=0; i<=364; i++) {
            const d = new Date(heatStart);
            d.setDate(heatStart.getDate() + i);
            const ds = getDateString(d);
            
            let successCount = 0;
            if(journalData[ds]) {
                if(journalData[ds].reading.status === 'success') successCount++;
                if(journalData[ds].exercise.status === 'success') successCount++;
                if(journalData[ds].study.status === 'success') successCount++;
            }
            
            let lvl = successCount === 0 ? '' : `level-${successCount}`;
            if(successCount === 3) lvl = 'level-4';
            
            heatmapGrid.innerHTML += `<div class="heat-cell ${lvl}" title="${ds} | 성공: ${successCount}개"></div>`;
            
            // Auto scroll to right
            setTimeout(() => {
                const container = document.querySelector('.heatmap-container');
                if(container) container.scrollLeft = container.scrollWidth;
            }, 100);
        }
    }
}

// Render History
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    // Check if journalData has keys
    const sortedDates = Object.keys(journalData).sort((a,b) => b.localeCompare(a));
    
    let hasRecords = false;

    sortedDates.forEach(date => {
        const dt = journalData[date];
        let entriesHtml = '';
        let hasActiveEntry = false;

        CATEGORIES.forEach(cat => {
            const st = dt[cat.id];
            if(st && st.status !== 'none') {
                hasActiveEntry = true;
                const stLabel = st.status === 'success' ? '성공' : '실패';
                entriesHtml += `
                <div class="cat-hist">
                    <div class="cat-name">${cat.label}</div>
                    <div class="cat-stat ${st.status}">${stLabel}</div>
                    <div class="cat-note">${st.note || '<span style="color:var(--text-secondary);font-style:italic;">기록 없음</span>'}</div>
                </div>`;
            }
        });
        
        if(hasActiveEntry) {
            hasRecords = true;
            list.innerHTML += `
            <div class="history-item">
                <div class="history-date">${date}</div>
                ${entriesHtml}
            </div>`;
        }
    });

    if(!hasRecords) {
        list.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-secondary);">아직 클라우드에 기록된 성장 히스토리가 없습니다!</div>`;
    }
}

// Start application by loading data from Supabase
loadDataFromSupabase();
