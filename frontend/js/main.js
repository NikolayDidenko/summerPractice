const API = '/api';

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById('section-' + btn.dataset.section).classList.remove('hidden');
    });
});

// Search form
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value.trim();
    if (!query) return;

    const loading = document.getElementById('searchLoading');
    const error = document.getElementById('searchError');
    const results = document.getElementById('results');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    results.classList.add('hidden');

    try {
        const res = await fetch(`${API}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Ошибка сервера');
        }
        const data = await res.json();
        results.classList.remove('hidden');
        renderResults(data);
    } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
});

// Compare form
document.getElementById('compareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('prof1').value.trim();
    const p2 = document.getElementById('prof2').value.trim();
    if (!p1 || !p2) return;

    const loading = document.getElementById('compareLoading');
    const error = document.getElementById('compareError');
    const results = document.getElementById('compareResults');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    results.classList.add('hidden');

    try {
        const res = await fetch(`${API}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profession1: p1, profession2: p2 })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Ошибка сервера');
        }
        const data = await res.json();
        renderCompare(data);
        results.classList.remove('hidden');
    } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
});

function renderResults(data) {
    document.getElementById('resultTitle').textContent = data.query;

    // Stats row
    const statsRow = document.getElementById('statsRow');
    if (!statsRow) return;
    statsRow.innerHTML = `
        <div class="stat-card">
            <div class="label">Всего вакансий</div>
            <div class="value accent">${data.total.toLocaleString('ru-RU')}</div>
        </div>
        <div class="stat-card">
            <div class="label">Средняя зарплата</div>
            <div class="value">${data.avg_salary ? data.avg_salary.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
        </div>
        <div class="stat-card">
            <div class="label">От</div>
            <div class="value">${data.salary_from ? data.salary_from.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
        </div>
        <div class="stat-card">
            <div class="label">До</div>
            <div class="value">${data.salary_to ? data.salary_to.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
        </div>
    `;

    // Top cities by count
    renderCityTable('topCitiesCount', data.top_cities_count, true);

    // Top cities by salary
    renderCityTable('topCitiesSalary', data.top_cities_salary, false);

    // Heat map
    renderHeatmap(data.regions);
}

function renderCityTable(containerId, cities, showCountOnly) {
    const container = document.getElementById(containerId);
    if (!cities || cities.length === 0) {
        container.innerHTML = '<div style="padding: 24px;text-align:center;color:var(--white)">Нет данных</div>';
        return;
    }
    let html = '<table><thead><tr><th></th><th>Регион</th>';
    if (showCountOnly) {
        html += '<th>Вакансий</th>';
    } else {
        html += '<th>Вакансий</th><th>Средняя зарплата</th>';
    }
    html += '</tr></thead><tbody>';
    cities.forEach((c, i) => {
        html += `<tr>
            <td class="rank">#${i + 1}</td>
            <td>${c.name}</td>
            <td><span class="count-badge">${c.count}</span></td>`;
        if (!showCountOnly) {
            html += `<td class="salary">${c.avg_salary ? c.avg_salary.toLocaleString('ru-RU') + ' ₽' : '—'}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderCompare(data) {
    const p1 = data.profession1;
    const p2 = data.profession2;
    const table = document.getElementById('compareTable');

    const allCities = new Set();
    (p1.top_cities || []).forEach(c => allCities.add(c.name));
    (p2.top_cities || []).forEach(c => allCities.add(c.name));

    let html = `<thead>
        <tr>
            <th></th>
            <th class="col1">${p1.query}</th>
            <th class="col2">${p2.query}</th>
        </tr>
    </thead><tbody>
        <tr>
            <td>Всего вакансий</td>
            <td><strong>${p1.total.toLocaleString('ru-RU')}</strong></td>
            <td><strong>${p2.total.toLocaleString('ru-RU')}</strong></td>
        </tr>
        <tr>
            <td>Средняя зарплата</td>
            <td><strong>${p1.avg_salary ? p1.avg_salary.toLocaleString('ru-RU') + ' ₽' : '—'}</strong></td>
            <td><strong>${p2.avg_salary ? p2.avg_salary.toLocaleString('ru-RU') + ' ₽' : '—'}</strong></td>
        </tr>`;

    // Cities comparison
    const p1CityMap = {};
    const p2CityMap = {};
    (p1.top_cities || []).forEach(c => p1CityMap[c.name] = c.count);
    (p2.top_cities || []).forEach(c => p2CityMap[c.name] = c.count);

    Array.from(allCities).slice(0, 5).forEach(city => {
        html += `<tr>
            <td>${city}</td>
            <td>${p1CityMap[city] ? `<span class="count-badge">${p1CityMap[city]}</span>` : '—'}</td>
            <td>${p2CityMap[city] ? `<span class="count-badge">${p2CityMap[city]}</span>` : '—'}</td>
        </tr>`;
    });

    html += '</tbody>';
    table.innerHTML = html;
}
