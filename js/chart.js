/* ===================================================
   chart.js — Scatter-Line Chart with flexible data points
   Supports: drag editing (both axes), add/remove points
   PC: mouse drag, Mobile: touch & drag
   =================================================== */

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

    function create(maxAge) {
        const ctx = document.getElementById('life-chart').getContext('2d');
        const colors = getThemeColors();

        // Initialize data if empty — start with just 0 and maxAge
        if (!AppState.graphData.points || AppState.graphData.points.length === 0) {
            AppState.graphData = {
                points: [
                    { age: 0, physical: 0, spiritual: 0, emotional: 0 },
                    { age: maxAge, physical: 0, spiritual: 0, emotional: 0 }
                ]
            };
        }

        // Sort points by age
        sortPoints();

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '🏃 신체',
                        data: pointsToXY('physical'),
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
                        data: pointsToXY('spiritual'),
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
                        data: pointsToXY('emotional'),
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

        // Bind direct canvas event listeners for drag
        bindCanvasDrag(chart);

        // Populate age select for form input
        populateAgeSelect();
        // Highlight controls
        updatePointControls();

        return chart;
    }

    // ===== Convert AppState points to {x, y} arrays =====
    function pointsToXY(field) {
        return AppState.graphData.points.map(p => ({ x: p.age, y: p[field] }));
    }

    function sortPoints() {
        AppState.graphData.points.sort((a, b) => a.age - b.age);
    }

    // ===== Direct Canvas Drag + Add/Remove Gestures =====
    function bindCanvasDrag(ch) {
        const canvas = ch.canvas;

        // Prevent any existing listeners (in case of re-create)
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
            const xScale = ch.scales.x;
            const yScale = ch.scales.y;
            let age = Math.round(xScale.getValueForPixel(pos.x));
            let val = Math.round(yScale.getValueForPixel(pos.y));
            age = Math.max(0, Math.min(AppState.userInfo.age, age));
            val = Math.max(-100, Math.min(100, val));
            return { age, val };
        }

        function isInChartArea(pos) {
            const area = ch.chartArea;
            return pos.x >= area.left && pos.x <= area.right && pos.y >= area.top && pos.y <= area.bottom;
        }

        // ── Drag ──
        function onStart(e) {
            longPressTriggered = false;
            const pos = getPos(e);
            const hit = findHit(pos);

            // Start long-press timer for touch (delete gesture)
            if (e.touches && hit) {
                longPressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    isDragging = false;
                    const pt = AppState.graphData.points[hit.index];
                    if (pt) {
                        showDeleteConfirm(pt.age, e);
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
                // Cancel long-press if user moved (it's a drag)
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }

                e.preventDefault();

                const { age: newAge, val: newVal } = posToChartValues(pos);

                AppState.graphData.points[dragPointIdx].age = newAge;
                const fields = ['physical', 'spiritual', 'emotional'];
                AppState.graphData.points[dragPointIdx][fields[dragDatasetIdx]] = newVal;

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
                isDragging = false;
                dragDatasetIdx = -1;
                dragPointIdx = -1;
                canvas.style.cursor = 'default';
                sortPoints();
                rebuildChartData();
                ch.update('none');
                populateAgeSelect();
                updatePointControls();
            }
        }

        // ── Double-click/Double-tap → Add point on empty space ──
        function onDblClick(e) {
            const pos = getPos(e);
            if (!isInChartArea(pos)) return;

            const hit = findHit(pos);
            if (hit) return; // Don't add if clicking on existing point

            const { age } = posToChartValues(pos);
            addPoint(age, 0, 0, 0);
        }

        // ── Right-click on vertex → Delete (PC) ──
        function onContextMenu(e) {
            const pos = getPos(e);
            const hit = findHit(pos);
            if (hit && isInChartArea(pos)) {
                e.preventDefault();
                const pt = AppState.graphData.points[hit.index];
                if (pt) {
                    showDeleteConfirm(pt.age, e);
                }
            }
        }

        // ── Delete confirm popup ──
        function showDeleteConfirm(age, e) {
            // Remove any existing popup
            const existing = document.querySelector('.chart-confirm-popup');
            if (existing) existing.remove();

            const pt = AppState.graphData.points.find(p => p.age === age);
            if (!pt) return;

            // Don't allow if only 2 points
            if (AppState.graphData.points.length <= 2) {
                showToast('⚠️ 최소 2개의 꼭지점이 필요합니다');
                return;
            }

            const popup = document.createElement('div');
            popup.className = 'chart-confirm-popup';
            popup.innerHTML = `
                <div class="confirm-content">
                    <p>${age}세 꼭지점을 삭제할까요?</p>
                    <div class="confirm-buttons">
                        <button class="confirm-yes">🗑️ 삭제</button>
                        <button class="confirm-no">취소</button>
                    </div>
                </div>
            `;

            // Position near the event
            const rect = canvas.getBoundingClientRect();
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

            // Animate in
            requestAnimationFrame(() => popup.classList.add('show'));

            popup.querySelector('.confirm-yes').addEventListener('click', () => {
                removePoint(age);
                popup.remove();
            });

            popup.querySelector('.confirm-no').addEventListener('click', () => {
                popup.remove();
            });

            // Auto-dismiss after 5s
            setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);

            // Dismiss on outside click
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

        // Touch events (passive: false to allow preventDefault)
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);
        canvas.addEventListener('touchcancel', onEnd);

        // Cleanup function for re-initialization
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

    function rebuildChartData() {
        if (!chart) return;
        chart.data.datasets[0].data = pointsToXY('physical');
        chart.data.datasets[1].data = pointsToXY('spiritual');
        chart.data.datasets[2].data = pointsToXY('emotional');
    }

    // ===== Add / Remove Points =====
    function addPoint(age, physical, spiritual, emotional) {
        // Check for duplicate age
        const existing = AppState.graphData.points.find(p => p.age === age);
        if (existing) {
            existing.physical = physical;
            existing.spiritual = spiritual;
            existing.emotional = emotional;
            showToast(`✏️ ${age}세 데이터 업데이트됨`);
        } else {
            AppState.graphData.points.push({ age, physical, spiritual, emotional });
            showToast(`📍 ${age}세 꼭지점 추가됨`);
        }
        sortPoints();
        rebuildChartData();
        if (chart) chart.update();
        populateAgeSelect();
        updatePointControls();
    }

    function removePoint(age) {
        const idx = AppState.graphData.points.findIndex(p => p.age === age);
        if (idx === -1) return;
        // Don't allow removing if only 2 points left
        if (AppState.graphData.points.length <= 2) {
            showToast('⚠️ 최소 2개의 꼭지점이 필요합니다');
            return;
        }
        AppState.graphData.points.splice(idx, 1);
        rebuildChartData();
        if (chart) chart.update();
        populateAgeSelect();
        updatePointControls();
        showToast(`🗑️ ${age}세 꼭지점 삭제됨`);
    }

    // ===== Update Form Controls =====
    function populateAgeSelect() {
        const select = document.getElementById('form-age-select');
        if (!select) return;
        select.innerHTML = '';
        AppState.graphData.points.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${p.age}세`;
            select.appendChild(opt);
        });
    }

    function updatePointControls() {
        const container = document.getElementById('point-list-container');
        if (!container) return;

        container.innerHTML = AppState.graphData.points.map((p, i) => `
            <div class="point-chip" data-age="${p.age}">
                <span class="point-chip-age">${p.age}세</span>
                <span class="point-chip-vals">
                    <span style="color:var(--color-physical)">신${p.physical > 0 ? '+' : ''}${p.physical}</span>
                    <span style="color:var(--color-spiritual)">영${p.spiritual > 0 ? '+' : ''}${p.spiritual}</span>
                    <span style="color:var(--color-emotional)">정${p.emotional > 0 ? '+' : ''}${p.emotional}</span>
                </span>
                <button class="point-chip-delete" data-age="${p.age}" title="삭제">✕</button>
            </div>
        `).join('');

        // Delete buttons
        container.querySelectorAll('.point-chip-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removePoint(parseInt(btn.dataset.age));
            });
        });

        // Click to select in form
        container.querySelectorAll('.point-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('point-chip-delete')) return;
                const age = parseInt(chip.dataset.age);
                const idx = AppState.graphData.points.findIndex(p => p.age === age);
                const select = document.getElementById('form-age-select');
                if (select && idx >= 0) {
                    select.value = idx;
                    select.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    function updatePointFromForm(ageIndex, physical, spiritual, emotional) {
        if (!chart || ageIndex < 0 || ageIndex >= AppState.graphData.points.length) return;
        AppState.graphData.points[ageIndex].physical = physical;
        AppState.graphData.points[ageIndex].spiritual = spiritual;
        AppState.graphData.points[ageIndex].emotional = emotional;
        rebuildChartData();
        chart.update('none');
        updatePointControls();
    }

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
        create, addPoint, removePoint, updatePointFromForm,
        updateTheme, setAnnotations, getChart,
        rebuildChartData, populateAgeSelect, updatePointControls
    };
})();
