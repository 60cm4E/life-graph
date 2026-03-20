/* ===================================================
   chart.js — Scatter-Line Chart with independent data points
   Each category (physical/spiritual/emotional) has its own
   point array with independent ages and values.
   PC: mouse drag, Mobile: touch & drag
   =================================================== */

const CATEGORIES = ['physical', 'spiritual', 'emotional'];
const CATEGORY_LABELS = { physical: '신체', spiritual: '영적', emotional: '정서' };
const CATEGORY_ICONS = { physical: '🏃', spiritual: '🙏', emotional: '💛' };

const LifeChart = (() => {
    let chart = null;
    let isDragging = false;
    let dragDatasetIdx = -1;
    let dragPointIdx = -1;

    function getThemeColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            physical: style.getPropertyValue('--color-physical').trim(),
            spiritual: style.getPropertyValue('--color-spiritual').trim(),
            emotional: style.getPropertyValue('--color-emotional').trim(),
            physicalBg: style.getPropertyValue('--color-physical-bg').trim(),
            spiritualBg: style.getPropertyValue('--color-spiritual-bg').trim(),
            emotionalBg: style.getPropertyValue('--color-emotional-bg').trim(),
            text: style.getPropertyValue('--text-primary').trim(),
            textSecondary: style.getPropertyValue('--text-secondary').trim(),
            grid: style.getPropertyValue('--input-border').trim(),
        };
    }

    // ===== Initialize empty data per category =====
    function initData(maxAge) {
        if (!AppState.graphData.physical) {
            AppState.graphData = {
                physical: [{ age: 0, value: 0 }, { age: maxAge, value: 0 }],
                spiritual: [{ age: 0, value: 0 }, { age: maxAge, value: 0 }],
                emotional: [{ age: 0, value: 0 }, { age: maxAge, value: 0 }],
            };
        }
    }

    function create(maxAge) {
        const ctx = document.getElementById('life-chart').getContext('2d');
        const colors = getThemeColors();

        initData(maxAge);
        sortAllPoints();

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '🏃 신체',
                        data: toXY('physical'),
                        borderColor: colors.physical,
                        backgroundColor: colors.physicalBg,
                        fill: false,
                        tension: 0.35,
                        pointRadius: 8,
                        pointHoverRadius: 13,
                        pointBackgroundColor: colors.physical,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                        pointHitRadius: 20,
                    },
                    {
                        label: '🙏 영적',
                        data: toXY('spiritual'),
                        borderColor: colors.spiritual,
                        backgroundColor: colors.spiritualBg,
                        fill: false,
                        tension: 0.35,
                        pointRadius: 8,
                        pointHoverRadius: 13,
                        pointBackgroundColor: colors.spiritual,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                        pointHitRadius: 20,
                    },
                    {
                        label: '💛 정서',
                        data: toXY('emotional'),
                        borderColor: colors.emotional,
                        backgroundColor: colors.emotionalBg,
                        fill: false,
                        tension: 0.35,
                        pointRadius: 8,
                        pointHoverRadius: 13,
                        pointBackgroundColor: colors.emotional,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                        pointHitRadius: 20,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: false,
                normalized: true,
                interaction: {
                    mode: 'nearest',
                    intersect: true,
                    axis: 'xy'
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: maxAge,
                        title: {
                            display: true,
                            text: '나이',
                            color: colors.textSecondary,
                            font: { size: 13, weight: '600', family: "'Inter', sans-serif" }
                        },
                        ticks: {
                            color: colors.textSecondary,
                            stepSize: 5,
                            font: { family: "'Inter', sans-serif" },
                            callback: (v) => `${v}`
                        },
                        grid: { color: colors.grid }
                    },
                    y: {
                        min: -100,
                        max: 100,
                        title: {
                            display: true,
                            text: '점수',
                            color: colors.textSecondary,
                            font: { size: 13, weight: '600', family: "'Inter', sans-serif" }
                        },
                        ticks: {
                            color: colors.textSecondary,
                            stepSize: 25,
                            font: { family: "'Inter', sans-serif" },
                            callback: (v) => v > 0 ? `+${v}` : v
                        },
                        grid: {
                            color: (ctx) => {
                                if (ctx.tick.value === 0) return colors.textSecondary;
                                return colors.grid;
                            },
                            lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1,
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: colors.text,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 16,
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,15,26,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#e8e8f0',
                        borderColor: 'rgba(99,102,241,0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" },
                        callbacks: {
                            title: (items) => `나이: ${Math.round(items[0].parsed.x)}세`,
                            label: (item) => {
                                const v = Math.round(item.parsed.y);
                                return ` ${item.dataset.label}: ${v > 0 ? '+' : ''}${v}`;
                            }
                        }
                    },
                    dragData: false,
                    annotation: {
                        annotations: {}
                    }
                },
            },
        });

        bindCanvasDrag(chart);
        updatePointControls();

        return chart;
    }

    // ===== Data helpers =====
    function toXY(cat) {
        return (AppState.graphData[cat] || []).map(p => ({ x: p.age, y: p.value }));
    }

    function sortAllPoints() {
        CATEGORIES.forEach(cat => {
            if (AppState.graphData[cat]) {
                AppState.graphData[cat].sort((a, b) => a.age - b.age);
            }
        });
    }

    function rebuildChartData() {
        if (!chart) return;
        chart.data.datasets[0].data = toXY('physical');
        chart.data.datasets[1].data = toXY('spiritual');
        chart.data.datasets[2].data = toXY('emotional');
    }

    // ===== Direct Canvas Drag + Add/Remove Gestures =====
    function bindCanvasDrag(ch) {
        const canvas = ch.canvas;
        canvas._dragCleanup && canvas._dragCleanup();

        let longPressTimer = null;
        let longPressTriggered = false;

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            if (e.changedTouches && e.changedTouches.length > 0) {
                return { x: e.changedTouches[0].clientX - rect.left, y: e.changedTouches[0].clientY - rect.top };
            }
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        function findHit(pos) {
            const hitRadius = 20;
            for (let dsIdx = 0; dsIdx < ch.data.datasets.length; dsIdx++) {
                const meta = ch.getDatasetMeta(dsIdx);
                for (let ptIdx = 0; ptIdx < meta.data.length; ptIdx++) {
                    const el = meta.data[ptIdx];
                    const dx = pos.x - el.x;
                    const dy = pos.y - el.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
                        return { datasetIndex: dsIdx, index: ptIdx };
                    }
                }
            }
            return null;
        }

        function posToChartValues(pos) {
            let age = Math.round(ch.scales.x.getValueForPixel(pos.x));
            let val = Math.round(ch.scales.y.getValueForPixel(pos.y));
            age = Math.max(0, Math.min(AppState.userInfo.age, age));
            val = Math.max(-100, Math.min(100, val));
            return { age, val };
        }

        function isInChartArea(pos) {
            const area = ch.chartArea;
            return pos.x >= area.left && pos.x <= area.right && pos.y >= area.top && pos.y <= area.bottom;
        }

        // Find the nearest line (dataset) to a position
        function findNearestDataset(pos) {
            let minDist = Infinity;
            let nearestIdx = 0;
            for (let dsIdx = 0; dsIdx < ch.data.datasets.length; dsIdx++) {
                const meta = ch.getDatasetMeta(dsIdx);
                for (let ptIdx = 0; ptIdx < meta.data.length - 1; ptIdx++) {
                    const p1 = meta.data[ptIdx];
                    const p2 = meta.data[ptIdx + 1];
                    const d = distToSegment(pos, p1, p2);
                    if (d < minDist) {
                        minDist = d;
                        nearestIdx = dsIdx;
                    }
                }
                // Also check distance to each point
                for (let ptIdx = 0; ptIdx < meta.data.length; ptIdx++) {
                    const el = meta.data[ptIdx];
                    const dx = pos.x - el.x;
                    const dy = pos.y - el.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < minDist) {
                        minDist = d;
                        nearestIdx = dsIdx;
                    }
                }
            }
            return nearestIdx;
        }

        function distToSegment(p, v, w) {
            const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
            if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
            return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
        }

        // ── Drag ──
        function onStart(e) {
            longPressTriggered = false;
            const pos = getPos(e);
            const hit = findHit(pos);

            if (e.touches && hit) {
                const hitCat = CATEGORIES[hit.datasetIndex];
                const hitPt = AppState.graphData[hitCat][hit.index];
                longPressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    isDragging = false;
                    if (hitPt) {
                        showDeleteConfirm(hit.datasetIndex, hit.index, e);
                    }
                }, 500);
            }

            if (hit) {
                isDragging = true;
                dragDatasetIdx = hit.datasetIndex;
                dragPointIdx = hit.index;
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        }

        function onMove(e) {
            const pos = getPos(e);

            if (isDragging && !longPressTriggered) {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }

                e.preventDefault();

                const { age: newAge, val: newVal } = posToChartValues(pos);
                const cat = CATEGORIES[dragDatasetIdx];

                // Update only this category's point
                AppState.graphData[cat][dragPointIdx].age = newAge;
                AppState.graphData[cat][dragPointIdx].value = newVal;

                rebuildChartData();
                ch.update('none');
            } else if (!isDragging) {
                const hit = findHit(pos);
                canvas.style.cursor = hit ? 'grab' : 'default';
            }
        }

        function onEnd(e) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            if (longPressTriggered) {
                longPressTriggered = false;
                isDragging = false;
                return;
            }
            if (isDragging) {
                const cat = CATEGORIES[dragDatasetIdx];
                isDragging = false;
                dragDatasetIdx = -1;
                dragPointIdx = -1;
                canvas.style.cursor = 'default';
                AppState.graphData[cat].sort((a, b) => a.age - b.age);
                rebuildChartData();
                ch.update('none');
                updatePointControls();
            }
        }

        // ── Double-click/Double-tap → Add point on nearest line ──
        function onDblClick(e) {
            const pos = getPos(e);
            if (!isInChartArea(pos)) return;

            const hit = findHit(pos);
            if (hit) return;

            const { age, val } = posToChartValues(pos);
            const dsIdx = findNearestDataset(pos);
            const cat = CATEGORIES[dsIdx];

            // Check for duplicate age in this category
            const existing = AppState.graphData[cat].find(p => p.age === age);
            if (existing) {
                existing.value = val;
                showToast(`✏️ ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${age}세 업데이트됨`);
            } else {
                AppState.graphData[cat].push({ age, value: val });
                AppState.graphData[cat].sort((a, b) => a.age - b.age);
                showToast(`📍 ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${age}세 추가됨`);
            }
            rebuildChartData();
            if (chart) chart.update();
            updatePointControls();
        }

        // ── Right-click on vertex → Delete (PC) ──
        function onContextMenu(e) {
            const pos = getPos(e);
            const hit = findHit(pos);
            if (hit && isInChartArea(pos)) {
                e.preventDefault();
                showDeleteConfirm(hit.datasetIndex, hit.index, e);
            }
        }

        // ── Delete confirm popup ──
        function showDeleteConfirm(dsIdx, ptIdx, e) {
            const existing = document.querySelector('.chart-confirm-popup');
            if (existing) existing.remove();

            const cat = CATEGORIES[dsIdx];
            const pts = AppState.graphData[cat];
            if (!pts || ptIdx >= pts.length) return;

            if (pts.length <= 2) {
                showToast(`⚠️ ${CATEGORY_LABELS[cat]} 최소 2개의 꼭지점이 필요합니다`);
                return;
            }

            const pt = pts[ptIdx];
            const popup = document.createElement('div');
            popup.className = 'chart-confirm-popup';
            popup.innerHTML = `
                <div class="confirm-content">
                    <p>${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${pt.age}세 삭제?</p>
                    <div class="confirm-buttons">
                        <button class="confirm-yes">🗑️ 삭제</button>
                        <button class="confirm-no">취소</button>
                    </div>
                </div>
            `;

            let popX, popY;
            if (e.touches && e.touches.length > 0) {
                popX = e.touches[0].clientX;
                popY = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                popX = e.changedTouches[0].clientX;
                popY = e.changedTouches[0].clientY;
            } else {
                popX = e.clientX;
                popY = e.clientY;
            }

            popup.style.left = `${popX}px`;
            popup.style.top = `${popY - 60}px`;
            document.body.appendChild(popup);
            requestAnimationFrame(() => popup.classList.add('show'));

            popup.querySelector('.confirm-yes').addEventListener('click', () => {
                removePoint(cat, ptIdx);
                popup.remove();
            });

            popup.querySelector('.confirm-no').addEventListener('click', () => {
                popup.remove();
            });

            setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);

            const dismissHandler = (ev) => {
                if (!popup.contains(ev.target)) {
                    popup.remove();
                    document.removeEventListener('click', dismissHandler);
                    document.removeEventListener('touchstart', dismissHandler);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', dismissHandler);
                document.addEventListener('touchstart', dismissHandler);
            }, 100);
        }

        // Mouse events
        canvas.addEventListener('mousedown', onStart);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onEnd);
        canvas.addEventListener('mouseleave', onEnd);
        canvas.addEventListener('dblclick', onDblClick);
        canvas.addEventListener('contextmenu', onContextMenu);

        // Touch events
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);
        canvas.addEventListener('touchcancel', onEnd);

        canvas._dragCleanup = () => {
            canvas.removeEventListener('mousedown', onStart);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseup', onEnd);
            canvas.removeEventListener('mouseleave', onEnd);
            canvas.removeEventListener('dblclick', onDblClick);
            canvas.removeEventListener('contextmenu', onContextMenu);
            canvas.removeEventListener('touchstart', onStart);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onEnd);
            canvas.removeEventListener('touchcancel', onEnd);
        };
    }

    // ===== Add / Remove Points (per category) =====
    function addPoint(cat, age, value) {
        if (!AppState.graphData[cat]) return;

        const existing = AppState.graphData[cat].find(p => p.age === age);
        if (existing) {
            existing.value = value;
            showToast(`✏️ ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${age}세 업데이트됨`);
        } else {
            AppState.graphData[cat].push({ age, value });
            AppState.graphData[cat].sort((a, b) => a.age - b.age);
            showToast(`📍 ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${age}세 추가됨`);
        }
        rebuildChartData();
        if (chart) chart.update();
        updatePointControls();
    }

    // Add a point to ALL categories at once (from toolbar)
    function addPointAll(age) {
        CATEGORIES.forEach(cat => {
            const existing = AppState.graphData[cat].find(p => p.age === age);
            if (!existing) {
                AppState.graphData[cat].push({ age, value: 0 });
                AppState.graphData[cat].sort((a, b) => a.age - b.age);
            }
        });
        rebuildChartData();
        if (chart) chart.update();
        updatePointControls();
        showToast(`📍 ${age}세 꼭지점 추가됨 (전체)`);
    }

    function removePoint(cat, ptIdx) {
        const pts = AppState.graphData[cat];
        if (!pts || ptIdx < 0 || ptIdx >= pts.length) return;
        if (pts.length <= 2) {
            showToast(`⚠️ ${CATEGORY_LABELS[cat]} 최소 2개의 꼭지점이 필요합니다`);
            return;
        }
        const removed = pts.splice(ptIdx, 1)[0];
        rebuildChartData();
        if (chart) chart.update();
        updatePointControls();
        showToast(`🗑️ ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} ${removed.age}세 삭제됨`);
    }

    // ===== Update Point Controls (chips) =====
    function updatePointControls() {
        const container = document.getElementById('point-list-container');
        if (!container) return;

        let html = '';
        CATEGORIES.forEach((cat, dsIdx) => {
            const pts = AppState.graphData[cat] || [];
            const colorVar = `--color-${cat}`;
            pts.forEach((p, i) => {
                const v = p.value > 0 ? `+${p.value}` : p.value;
                html += `
                    <div class="point-chip" data-cat="${cat}" data-idx="${i}" style="border-color:var(${colorVar})">
                        <span class="point-chip-icon">${CATEGORY_ICONS[cat]}</span>
                        <span class="point-chip-age">${p.age}세</span>
                        <span class="point-chip-val" style="color:var(${colorVar})">${v}</span>
                        <button class="point-chip-delete" data-cat="${cat}" data-idx="${i}" title="삭제">✕</button>
                    </div>
                `;
            });
        });

        container.innerHTML = html;

        container.querySelectorAll('.point-chip-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removePoint(btn.dataset.cat, parseInt(btn.dataset.idx));
            });
        });
    }

    // ===== Form support =====
    function updatePointFromForm(cat, ptIdx, value) {
        if (!chart || !AppState.graphData[cat] || ptIdx < 0 || ptIdx >= AppState.graphData[cat].length) return;
        AppState.graphData[cat][ptIdx].value = value;
        rebuildChartData();
        chart.update('none');
        updatePointControls();
    }

    // ===== Theme =====
    function updateTheme() {
        if (!chart) return;
        const colors = getThemeColors();

        chart.data.datasets[0].borderColor = colors.physical;
        chart.data.datasets[0].backgroundColor = colors.physicalBg;
        chart.data.datasets[0].pointBackgroundColor = colors.physical;

        chart.data.datasets[1].borderColor = colors.spiritual;
        chart.data.datasets[1].backgroundColor = colors.spiritualBg;
        chart.data.datasets[1].pointBackgroundColor = colors.spiritual;

        chart.data.datasets[2].borderColor = colors.emotional;
        chart.data.datasets[2].backgroundColor = colors.emotionalBg;
        chart.data.datasets[2].pointBackgroundColor = colors.emotional;

        chart.options.scales.x.title.color = colors.textSecondary;
        chart.options.scales.x.ticks.color = colors.textSecondary;
        chart.options.scales.x.grid.color = colors.grid;
        chart.options.scales.y.title.color = colors.textSecondary;
        chart.options.scales.y.ticks.color = colors.textSecondary;
        chart.options.plugins.legend.labels.color = colors.text;

        chart.update();
    }

    function setAnnotations(annotations) {
        if (!chart) return;
        chart.options.plugins.annotation.annotations = annotations;
        chart.update();
    }

    function getChart() {
        return chart;
    }

    return {
        create, addPoint, addPointAll, removePoint, updatePointFromForm,
        updateTheme, setAnnotations, getChart,
        rebuildChartData, updatePointControls
    };
})();
