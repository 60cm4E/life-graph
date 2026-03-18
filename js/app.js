/* ===================================================
   app.js — App initialization & Global state
   =================================================== */

// ===== Global State =====
const AppState = {
    userInfo: { name: '', age: 0 },
    graphData: { labels: [], physical: [], spiritual: [], emotional: [] },
    events: []
};

// ===== App Init =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUserForm();
    initInputModeTabs();
    initFormInput();
    initEventForm();
    initActionButtons();

    // Try auto-load
    if (Storage.load()) {
        if (AppState.userInfo.age > 0) {
            LifeChart.create(AppState.userInfo.age);
            Events.renderTimeline();
            Events.updateChartAnnotations();
            showSections();
            document.getElementById('chart-user-name').textContent = AppState.userInfo.name;
        }
    }
});

// ===== Theme =====
function initTheme() {
    const saved = localStorage.getItem('life-graph-theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('life-graph-theme', next);
        LifeChart.updateTheme();
    });
}

// ===== User Form =====
function initUserForm() {
    document.getElementById('user-info-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('user-name').value.trim();
        const age = parseInt(document.getElementById('user-age').value);

        if (!name || !age || age < 1) {
            showToast('⚠️ 이름과 나이를 입력해주세요');
            return;
        }

        AppState.userInfo = { name, age };
        AppState.graphData = { labels: [], physical: [], spiritual: [], emotional: [] };
        AppState.events = [];

        document.getElementById('chart-user-name').textContent = name;
        LifeChart.create(age);
        Events.renderTimeline();
        showSections();
        showToast(`✨ ${name}님의 인생그래프가 생성되었습니다!`);

        // Scroll to chart
        document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth' });
    });
}

// ===== Input Mode Tabs =====
function initInputModeTabs() {
    const tabDrag = document.getElementById('tab-drag');
    const tabForm = document.getElementById('tab-form');
    const formPanel = document.getElementById('form-input-panel');

    tabDrag.addEventListener('click', () => {
        tabDrag.classList.add('active');
        tabForm.classList.remove('active');
        formPanel.classList.add('hidden');
    });

    tabForm.addEventListener('click', () => {
        tabForm.classList.add('active');
        tabDrag.classList.remove('active');
        formPanel.classList.remove('hidden');
        updateFormSliders();
    });
}

// ===== Form Input =====
function initFormInput() {
    const ageSelect = document.getElementById('form-age-select');
    const sliderPhys = document.getElementById('slider-physical');
    const sliderSpir = document.getElementById('slider-spiritual');
    const sliderEmot = document.getElementById('slider-emotional');
    const valPhys = document.getElementById('val-physical');
    const valSpir = document.getElementById('val-spiritual');
    const valEmot = document.getElementById('val-emotional');

    // Update display values
    sliderPhys.addEventListener('input', () => { valPhys.textContent = sliderPhys.value; });
    sliderSpir.addEventListener('input', () => { valSpir.textContent = sliderSpir.value; });
    sliderEmot.addEventListener('input', () => { valEmot.textContent = sliderEmot.value; });

    // When age changes, load current values
    ageSelect.addEventListener('change', updateFormSliders);

    // Apply button
    document.getElementById('btn-apply-form').addEventListener('click', () => {
        const idx = parseInt(ageSelect.value);
        const p = parseInt(sliderPhys.value);
        const s = parseInt(sliderSpir.value);
        const e = parseInt(sliderEmot.value);
        LifeChart.updatePointFromForm(idx, p, s, e);
        showToast(`✅ ${AppState.graphData.labels[idx]}세 값 적용됨`);
    });
}

function updateFormSliders() {
    const idx = parseInt(document.getElementById('form-age-select').value);
    if (isNaN(idx)) return;

    const p = AppState.graphData.physical[idx] || 0;
    const s = AppState.graphData.spiritual[idx] || 0;
    const e = AppState.graphData.emotional[idx] || 0;

    document.getElementById('slider-physical').value = p;
    document.getElementById('slider-spiritual').value = s;
    document.getElementById('slider-emotional').value = e;
    document.getElementById('val-physical').textContent = p;
    document.getElementById('val-spiritual').textContent = s;
    document.getElementById('val-emotional').textContent = e;
}

// ===== Event Form =====
function initEventForm() {
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const age = document.getElementById('event-age').value;
        const title = document.getElementById('event-title').value.trim();
        const memo = document.getElementById('event-memo').value.trim();

        if (!age || !title) {
            showToast('⚠️ 나이와 이벤트명을 입력해주세요');
            return;
        }

        Events.addEvent(age, title, memo);

        // Clear form
        document.getElementById('event-title').value = '';
        document.getElementById('event-memo').value = '';
    });
}

// ===== Action Buttons =====
function initActionButtons() {
    document.getElementById('btn-save').addEventListener('click', () => Storage.save());
    document.getElementById('btn-load').addEventListener('click', () => {
        if (Storage.load() && AppState.userInfo.age > 0) {
            LifeChart.create(AppState.userInfo.age);
            Events.renderTimeline();
            Events.updateChartAnnotations();
            showSections();
            document.getElementById('chart-user-name').textContent = AppState.userInfo.name;
        }
    });
    document.getElementById('btn-export-img').addEventListener('click', () => Storage.exportImage());
    document.getElementById('btn-export-json').addEventListener('click', () => Storage.exportJSON());

    const jsonInput = document.getElementById('json-file-input');
    document.getElementById('btn-import-json').addEventListener('click', () => jsonInput.click());
    jsonInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            Storage.importJSON(e.target.files[0]);
            jsonInput.value = '';
        }
    });
}
