/* ===================================================
   chart.js — Scatter-Line Chart with flexible data points
   Supports: drag editing (both axes), add/remove points
   =================================================== */

const LifeChart = (() => {
    let chart = null;
    let isDragging = false;
    let dragDatasetIdx = -1;
    let dragPointIdx = -1;
    let dragStartPos = null;
    let selectedPoint = { datasetIdx: -1, pointIdx: -1 };

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
                    dragData: false, // We handle drag ourselves
                    annotation: {
                        annotations: {}
                    }
                },
                // Disable default drag on mobile
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'],
            },
            plugins: [{
                id: 'customDrag',
                beforeEvent(chart, args) {
                    handleChartEvent(chart, args.event);
                }
            }]
        });

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

    // ===== Custom Drag Handling (supports both axes) =====
    function handleChartEvent(ch, evt) {
        const type = evt.type;
        const canvas = ch.canvas;
        const rect = canvas.getBoundingClientRect();

        if (type === 'mousedown' || type === 'touchstart') {
            const hit = findNearestPoint(ch, evt);
            if (hit) {
                isDragging = true;
                dragDatasetIdx = hit.datasetIndex;
                dragPointIdx = hit.index;
                dragStartPos = { x: evt.x, y: evt.y };
                canvas.style.cursor = 'grabbing';
                evt.native && evt.native.preventDefault && evt.native.preventDefault();
            }
        } else if ((type === 'mousemove' || type === 'touchmove') && isDragging) {
            const xScale = ch.scales.x;
            const yScale = ch.scales.y;

            let newAge = Math.round(xScale.getValueForPixel(evt.x));
            let newVal = Math.round(yScale.getValueForPixel(evt.y));

            // Clamp values
            newAge = Math.max(0, Math.min(AppState.userInfo.age, newAge));
            newVal = Math.max(-100, Math.min(100, newVal));

            // Update ALL datasets at this point index (all 3 categories share age)
            AppState.graphData.points[dragPointIdx].age = newAge;
            const fields = ['physical', 'spiritual', 'emotional'];
            AppState.graphData.points[dragPointIdx][fields[dragDatasetIdx]] = newVal;

            // Re-sort and rebuild
            rebuildChartData();
            ch.update('none');

            evt.native && evt.native.preventDefault && evt.native.preventDefault();
        } else if ((type === 'mouseup' || type === 'touchend') && isDragging) {
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

    function findNearestPoint(ch, evt) {
        const elements = ch.getElementsAtEventForMode(evt, 'nearest', { intersect: true, axis: 'xy' }, false);
        if (elements.length > 0) {
            return elements[0];
        }
        return null;
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
