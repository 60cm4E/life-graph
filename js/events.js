/* ===================================================
   events.js — Event management & Timeline
   =================================================== */

const Events = (() => {

    function addEvent(age, title, memo) {
        if (!title) return;
        AppState.events.push({ age: parseInt(age), title, memo: memo || '' });
        AppState.events.sort((a, b) => a.age - b.age);
        renderTimeline();
        updateChartAnnotations();
        showToast(`🏷️ "${title}" 이벤트 추가됨`);
    }

    function removeEvent(index) {
        const ev = AppState.events[index];
        AppState.events.splice(index, 1);
        renderTimeline();
        updateChartAnnotations();
        showToast(`🗑️ "${ev.title}" 삭제됨`);
    }

    function renderTimeline() {
        const container = document.getElementById('timeline-container');
        const emptyMsg = document.getElementById('timeline-empty');

        if (AppState.events.length === 0) {
            container.innerHTML = '';
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');
        container.innerHTML = AppState.events.map((ev, i) => `
            <div class="timeline-item" data-index="${i}">
                <span class="timeline-age">${ev.age}세</span>
                <span class="timeline-title">${escapeHtml(ev.title)}</span>
                ${ev.memo ? `<div class="timeline-memo">${escapeHtml(ev.memo)}</div>` : ''}
                <button class="timeline-delete" data-index="${i}" title="삭제">✕</button>
            </div>
        `).join('');

        // Toggle expand
        container.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('timeline-delete')) return;
                item.classList.toggle('expanded');
            });
        });

        // Delete buttons
        container.querySelectorAll('.timeline-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeEvent(parseInt(btn.dataset.index));
            });
        });
    }

    function updateChartAnnotations() {
        const colors = getComputedStyle(document.documentElement);
        const accent = colors.getPropertyValue('--accent').trim();
        const textColor = colors.getPropertyValue('--text-primary').trim();

        const annotations = {};
        AppState.events.forEach((ev, i) => {
            annotations[`event-line-${i}`] = {
                type: 'line',
                xMin: ev.age,
                xMax: ev.age,
                borderColor: accent,
                borderWidth: 1.5,
                borderDash: [6, 4],
                label: {
                    display: true,
                    content: ev.title,
                    position: 'start',
                    backgroundColor: 'rgba(99,102,241,0.85)',
                    color: '#fff',
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif",
                        weight: '500'
                    },
                    padding: { x: 8, y: 4 },
                    borderRadius: 6,
                    yAdjust: -10 - (i % 3) * 22, // stagger labels
                }
            };
        });

        LifeChart.setAnnotations(annotations);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { addEvent, removeEvent, renderTimeline, updateChartAnnotations };
})();
