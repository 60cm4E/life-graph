/* ===================================================
   chart.js — Chart.js Line Chart with drag editing
   =================================================== */

const LifeChart = (() => {
    let chart = null;

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
            positiveZone: style.getPropertyValue('--positive-zone').trim(),
            negativeZone: style.getPropertyValue('--negative-zone').trim(),
        };
    }

    function create(maxAge) {
        const ctx = document.getElementById('life-chart').getContext('2d');
        const colors = getThemeColors();

        // Initialize data if empty
        if (!AppState.graphData.physical.length) {
            const labels = [];
            const phys = [], spir = [], emot = [];
            // Create data points every 5 years + current age
            for (let age = 0; age <= maxAge; age += 5) {
                labels.push(age);
                phys.push(0);
                spir.push(0);
                emot.push(0);
            }
            if (maxAge % 5 !== 0) {
                labels.push(maxAge);
                phys.push(0);
                spir.push(0);
                emot.push(0);
            }
            AppState.graphData = {
                labels,
                physical: phys,
                spiritual: spir,
                emotional: emot
            };
        }

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: AppState.graphData.labels,
                datasets: [
                    {
                        label: '🏃 신체',
                        data: AppState.graphData.physical,
                        borderColor: colors.physical,
                        backgroundColor: colors.physicalBg,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: colors.physical,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                    },
                    {
                        label: '🙏 영적',
                        data: AppState.graphData.spiritual,
                        borderColor: colors.spiritual,
                        backgroundColor: colors.spiritualBg,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: colors.spiritual,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                    },
                    {
                        label: '💛 정서',
                        data: AppState.graphData.emotional,
                        borderColor: colors.emotional,
                        backgroundColor: colors.emotionalBg,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: colors.emotional,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        borderWidth: 3,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '나이',
                            color: colors.textSecondary,
                            font: { size: 13, weight: '600', family: "'Inter', sans-serif" }
                        },
                        ticks: {
                            color: colors.textSecondary,
                            font: { family: "'Inter', sans-serif" }
                        },
                        grid: {
                            color: colors.grid,
                        }
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
                            padding: 20,
                            font: { family: "'Inter', sans-serif", size: 13, weight: '500' }
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
                            title: (items) => `나이: ${items[0].label}세`,
                            label: (item) => ` ${item.dataset.label}: ${item.raw > 0 ? '+' : ''}${item.raw}`
                        }
                    },
                    dragData: {
                        round: 1,
                        showTooltip: true,
                        onDragEnd: (e, datasetIndex, index, value) => {
                            syncDataFromChart();
                        }
                    },
                    annotation: {
                        annotations: {}
                    }
                }
            }
        });

        // Populate age select for form input
        populateAgeSelect();

        return chart;
    }

    function syncDataFromChart() {
        if (!chart) return;
        AppState.graphData.physical = [...chart.data.datasets[0].data];
        AppState.graphData.spiritual = [...chart.data.datasets[1].data];
        AppState.graphData.emotional = [...chart.data.datasets[2].data];
    }

    function updatePointFromForm(ageIndex, physical, spiritual, emotional) {
        if (!chart) return;
        chart.data.datasets[0].data[ageIndex] = physical;
        chart.data.datasets[1].data[ageIndex] = spiritual;
        chart.data.datasets[2].data[ageIndex] = emotional;
        chart.update('none');
        syncDataFromChart();
    }

    function populateAgeSelect() {
        const select = document.getElementById('form-age-select');
        select.innerHTML = '';
        AppState.graphData.labels.forEach((age, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${age}세`;
            select.appendChild(opt);
        });
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

    return { create, updatePointFromForm, updateTheme, setAnnotations, getChart, syncDataFromChart, populateAgeSelect };
})();
