/* ===================================================
   storage.js — Save / Load / Export / Import
   =================================================== */

const Storage = (() => {
    const STORAGE_KEY = 'life-graph-data';

    function getData() {
        return {
            userInfo: AppState.userInfo,
            graphData: AppState.graphData,
            events: AppState.events
        };
    }

    function save() {
        try {
            const data = getData();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            showToast('💾 저장되었습니다!');
        } catch (e) {
            console.error('Save error:', e);
            showToast('❌ 저장 실패');
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                showToast('📭 저장된 데이터가 없습니다');
                return false;
            }
            const data = JSON.parse(raw);
            return applyData(data);
        } catch (e) {
            console.error('Load error:', e);
            showToast('❌ 불러오기 실패');
            return false;
        }
    }

    function applyData(data) {
        if (!data || !data.userInfo || !data.graphData) {
            showToast('❌ 유효하지 않은 데이터입니다');
            return false;
        }
        AppState.userInfo = data.userInfo;
        AppState.graphData = data.graphData;
        AppState.events = data.events || [];

        // Update UI
        document.getElementById('user-name').value = data.userInfo.name || '';
        document.getElementById('user-age').value = data.userInfo.age || '';

        showToast('📂 불러왔습니다!');
        return true;
    }

    function exportJSON() {
        const data = getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `인생그래프_${data.userInfo.name || 'data'}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📄 JSON 내보내기 완료!');
    }

    function importJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (applyData(data)) {
                    // Rebuild chart and events
                    LifeChart.create(AppState.userInfo.age);
                    Events.renderTimeline();
                    Events.updateChartAnnotations();
                    showSections();
                }
            } catch (err) {
                console.error('Import error:', err);
                showToast('❌ 잘못된 JSON 파일입니다');
            }
        };
        reader.readAsText(file);
    }

    async function exportImage() {
        const chartSection = document.getElementById('chart-section');
        try {
            showToast('🖼️ 이미지 생성 중...');
            const canvas = await html2canvas(chartSection, {
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary').trim(),
                scale: 2,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `인생그래프_${AppState.userInfo.name || 'graph'}_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('🖼️ 이미지 내보내기 완료!');
        } catch (err) {
            console.error('Export image error:', err);
            showToast('❌ 이미지 내보내기 실패');
        }
    }

    return { save, load, exportJSON, importJSON, exportImage };
})();

// ===== Toast Notification =====
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

function showSections() {
    ['chart-section', 'event-section', 'timeline-section', 'action-section'].forEach(id => {
        document.getElementById(id).classList.remove('hidden');
    });
}
