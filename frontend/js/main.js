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

let mapInstance = null;

function renderHeatmap(regions) {
    const container = document.getElementById('heatmap');
    if (!container) return;

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    if (!regions || regions.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:400px;color:var(--white);font-size:14px;">Нет данных для карты</div>';
        return;
    }
    container.innerHTML = '';
    container.style.height = '420px';

    mapInstance = L.map('heatmap', {
        center: [62.0, 100.0],
        zoom: 5,
        minZoom: 4,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        zoomControl: false,
        attributionControl: false,
    });

    mapInstance.setMaxBounds([[38, 15], [85, 190]]);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(mapInstance);

    requestAnimationFrame(() => mapInstance.invalidateSize());

    const maxCount = Math.max(...regions.map(r => r.count));
    const minCount = Math.min(...regions.map(r => r.count));

    function getColor(count) {
        const t = maxCount > minCount ? (count - minCount) / (maxCount - minCount) : 0.5;
        const r = Math.round(30 + t * 180);
        const g = Math.round(50 + t * 204);
        const b = Math.round(20 + t * 82);
        return `rgb(${r}, ${g}, ${b})`;
    }

    const names = regions.map(r => r.name);
    const coords = getCityCoords(names);

    const markers = L.featureGroup();

    regions.forEach((r, i) => {
        const pos = coords[i];
        if (!pos) return;

        const radius = Math.max(3, 3 + Math.sqrt(r.count / maxCount) * 7);
        const color = getColor(r.count);

        const circle = L.circleMarker([pos.lat, pos.lng], {
            radius: radius,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.9,
            fillOpacity: 0.85,
        });

        const popupText = `<b>${r.name}</b><br>Вакансий: ${r.count.toLocaleString('ru-RU')}${r.avg_salary ? '<br>Средняя: ' + r.avg_salary.toLocaleString('ru-RU') + ' ₽' : ''}`;
        circle.bindPopup(popupText);

        markers.addLayer(circle);
    });

    mapInstance.addLayer(markers);

    if (markers.getLayers().length > 0) {
        mapInstance.fitBounds(markers.getBounds().pad(0.03));
    }

    mapInstance.invalidateSize();
}

const CITY_COORDS = {
    'Москва': { lat: 55.7558, lng: 37.6173 },
    'г. Москва': { lat: 55.7558, lng: 37.6173 },
    'Московская область': { lat: 55.7558, lng: 37.6173 },
    'Санкт-Петербург': { lat: 59.9343, lng: 30.3351 },
    'г. Санкт-Петербург': { lat: 59.9343, lng: 30.3351 },
    'Ленинградская область': { lat: 59.9343, lng: 30.3351 },
    'Новосибирск': { lat: 55.0084, lng: 82.9357 },
    'Новосибирская область': { lat: 55.0084, lng: 82.9357 },
    'Екатеринбург': { lat: 56.8389, lng: 60.6057 },
    'Свердловская область': { lat: 56.8389, lng: 60.6057 },
    'Казань': { lat: 55.7961, lng: 49.1064 },
    'Республика Татарстан': { lat: 55.7961, lng: 49.1064 },
    'Татарстан': { lat: 55.7961, lng: 49.1064 },
    'Красноярск': { lat: 56.0153, lng: 92.8932 },
    'Красноярский край': { lat: 56.0153, lng: 92.8932 },
    'Нижний Новгород': { lat: 56.2965, lng: 43.9369 },
    'Нижегородская область': { lat: 56.2965, lng: 43.9369 },
    'Челябинск': { lat: 55.1600, lng: 61.4000 },
    'Челябинская область': { lat: 55.1600, lng: 61.4000 },
    'Самара': { lat: 53.1959, lng: 50.1002 },
    'Самарская область': { lat: 53.1959, lng: 50.1002 },
    'Уфа': { lat: 54.7388, lng: 55.9721 },
    'Республика Башкортостан': { lat: 54.7388, lng: 55.9721 },
    'Башкортостан': { lat: 54.7388, lng: 55.9721 },
    'Ростов-на-Дону': { lat: 47.2357, lng: 39.7015 },
    'Ростовская область': { lat: 47.2357, lng: 39.7015 },
    'Омск': { lat: 54.9885, lng: 73.3242 },
    'Омская область': { lat: 54.9885, lng: 73.3242 },
    'Краснодар': { lat: 45.0355, lng: 38.9753 },
    'Краснодарский край': { lat: 45.0355, lng: 38.9753 },
    'Воронеж': { lat: 51.6723, lng: 39.1843 },
    'Воронежская область': { lat: 51.6723, lng: 39.1843 },
    'Пермь': { lat: 58.0105, lng: 56.2502 },
    'Пермский край': { lat: 58.0105, lng: 56.2502 },
    'Волгоград': { lat: 48.7080, lng: 44.5133 },
    'Волгоградская область': { lat: 48.7080, lng: 44.5133 },
    'Саратов': { lat: 51.5336, lng: 46.0343 },
    'Саратовская область': { lat: 51.5336, lng: 46.0343 },
    'Тюмень': { lat: 57.1528, lng: 65.5273 },
    'Тюменская область': { lat: 57.1528, lng: 65.5273 },
    'Тольятти': { lat: 53.5303, lng: 49.3461 },
    'Барнаул': { lat: 53.3474, lng: 83.7785 },
    'Алтайский край': { lat: 53.3474, lng: 83.7785 },
    'Ижевск': { lat: 56.8498, lng: 53.2045 },
    'Удмуртская Республика': { lat: 56.8498, lng: 53.2045 },
    'Удмуртия': { lat: 56.8498, lng: 53.2045 },
    'Ульяновск': { lat: 54.3177, lng: 48.4002 },
    'Ульяновская область': { lat: 54.3177, lng: 48.4002 },
    'Иркутск': { lat: 52.2864, lng: 104.2808 },
    'Иркутская область': { lat: 52.2864, lng: 104.2808 },
    'Хабаровск': { lat: 48.4802, lng: 135.0719 },
    'Хабаровский край': { lat: 48.4802, lng: 135.0719 },
    'Ярославль': { lat: 57.6222, lng: 39.8683 },
    'Ярославская область': { lat: 57.6222, lng: 39.8683 },
    'Владивосток': { lat: 43.1155, lng: 131.8854 },
    'Приморский край': { lat: 43.1155, lng: 131.8854 },
    'Махачкала': { lat: 42.9849, lng: 47.5047 },
    'Республика Дагестан': { lat: 42.9849, lng: 47.5047 },
    'Дагестан': { lat: 42.9849, lng: 47.5047 },
    'Томск': { lat: 56.4977, lng: 84.9774 },
    'Томская область': { lat: 56.4977, lng: 84.9774 },
    'Оренбург': { lat: 51.7682, lng: 55.0970 },
    'Оренбургская область': { lat: 51.7682, lng: 55.0970 },
    'Кемерово': { lat: 55.3548, lng: 86.0874 },
    'Кемеровская область': { lat: 55.3548, lng: 86.0874 },
    'Рязань': { lat: 54.6269, lng: 39.6916 },
    'Рязанская область': { lat: 54.6269, lng: 39.6916 },
    'Астрахань': { lat: 46.3497, lng: 48.0408 },
    'Астраханская область': { lat: 46.3497, lng: 48.0408 },
    'Пенза': { lat: 53.2001, lng: 45.0174 },
    'Пензенская область': { lat: 53.2001, lng: 45.0174 },
    'Липецк': { lat: 52.6088, lng: 39.5992 },
    'Липецкая область': { lat: 52.6088, lng: 39.5992 },
    'Тула': { lat: 54.1961, lng: 37.6182 },
    'Тульская область': { lat: 54.1961, lng: 37.6182 },
    'Киров': { lat: 58.6035, lng: 49.6681 },
    'Кировская область': { lat: 58.6035, lng: 49.6681 },
    'Чебоксары': { lat: 56.1322, lng: 47.2519 },
    'Чувашская Республика': { lat: 56.1322, lng: 47.2519 },
    'Чувашия': { lat: 56.1322, lng: 47.2519 },
    'Калининград': { lat: 54.7065, lng: 20.5110 },
    'Калининградская область': { lat: 54.7065, lng: 20.5110 },
    'Брянск': { lat: 53.2434, lng: 34.3637 },
    'Брянская область': { lat: 53.2434, lng: 34.3637 },
    'Курск': { lat: 51.7340, lng: 36.1923 },
    'Курская область': { lat: 51.7340, lng: 36.1923 },
    'Иваново': { lat: 56.9997, lng: 40.9736 },
    'Ивановская область': { lat: 56.9997, lng: 40.9736 },
    'Тверь': { lat: 56.8587, lng: 35.9176 },
    'Тверская область': { lat: 56.8587, lng: 35.9176 },
    'Белгород': { lat: 50.6000, lng: 36.6000 },
    'Белгородская область': { lat: 50.6000, lng: 36.6000 },
    'Владимир': { lat: 56.1290, lng: 40.4070 },
    'Владимирская область': { lat: 56.1290, lng: 40.4070 },
    'Архангельск': { lat: 64.5399, lng: 40.5150 },
    'Архангельская область': { lat: 64.5399, lng: 40.5150 },
    'Смоленск': { lat: 54.7818, lng: 32.0401 },
    'Смоленская область': { lat: 54.7818, lng: 32.0401 },
    'Мурманск': { lat: 68.9585, lng: 33.0827 },
    'Мурманская область': { lat: 68.9585, lng: 33.0827 },
    'Республика Крым': { lat: 44.9482, lng: 34.1051 },
    'Крым': { lat: 44.9482, lng: 34.1051 },
    'Севастополь': { lat: 44.6167, lng: 33.5257 },
    'Петрозаводск': { lat: 61.7849, lng: 34.3469 },
    'Республика Карелия': { lat: 61.7849, lng: 34.3469 },
    'Карелия': { lat: 61.7849, lng: 34.3469 },
    'Сургут': { lat: 61.2500, lng: 73.4167 },
    'Нижневартовск': { lat: 60.9345, lng: 76.5582 },
    'Владикавказ': { lat: 43.0206, lng: 44.6818 },
    'Республика Северная Осетия — Алания': { lat: 43.0206, lng: 44.6818 },
    'Северная Осетия': { lat: 43.0206, lng: 44.6818 },
    'Грозный': { lat: 43.3125, lng: 45.6947 },
    'Чеченская Республика': { lat: 43.3125, lng: 45.6947 },
    'Чечня': { lat: 43.3125, lng: 45.6947 },
    'Республика Адыгея': { lat: 44.6098, lng: 40.1006 },
    'Адыгея': { lat: 44.6098, lng: 40.1006 },
    'Нальчик': { lat: 43.4980, lng: 43.6180 },
    'Кабардино-Балкарская Республика': { lat: 43.4980, lng: 43.6180 },
    'Улан-Удэ': { lat: 51.8333, lng: 107.6000 },
    'Республика Бурятия': { lat: 51.8333, lng: 107.6000 },
    'Бурятия': { lat: 51.8333, lng: 107.6000 },
    'Чита': { lat: 52.0333, lng: 113.5000 },
    'Забайкальский край': { lat: 52.0333, lng: 113.5000 },
    'Якутск': { lat: 62.0339, lng: 129.7331 },
    'Республика Саха': { lat: 62.0339, lng: 129.7331 },
    'Саха': { lat: 62.0339, lng: 129.7331 },
    'Якутия': { lat: 62.0339, lng: 129.7331 },
    'Петропавловск-Камчатский': { lat: 53.0500, lng: 158.6500 },
    'Камчатский край': { lat: 53.0500, lng: 158.6500 },
    'Южно-Сахалинск': { lat: 46.9572, lng: 142.7274 },
    'Сахалинская область': { lat: 46.9572, lng: 142.7274 },
    'Магадан': { lat: 59.5650, lng: 150.8000 },
    'Магаданская область': { lat: 59.5650, lng: 150.8000 },
    'Анадырь': { lat: 64.7333, lng: 177.5167 },
    'Чукотский АО': { lat: 64.7333, lng: 177.5167 },
    'Чукотский автономный округ': { lat: 64.7333, lng: 177.5167 },
    'Биробиджан': { lat: 48.7833, lng: 132.9333 },
    'Еврейская автономная область': { lat: 48.7833, lng: 132.9333 },
    'Горно-Алтайск': { lat: 51.9583, lng: 85.9603 },
    'Республика Алтай': { lat: 51.9583, lng: 85.9603 },
    'Алтай': { lat: 51.9583, lng: 85.9603 },
    'Благовещенск': { lat: 50.2833, lng: 127.5333 },
    'Амурская область': { lat: 50.2833, lng: 127.5333 },
    'Саранск': { lat: 54.1838, lng: 45.1749 },
    'Республика Мордовия': { lat: 54.1838, lng: 45.1749 },
    'Мордовия': { lat: 54.1838, lng: 45.1749 },
    'Йошкар-Ола': { lat: 56.6344, lng: 47.8999 },
    'Республика Марий Эл': { lat: 56.6344, lng: 47.8999 },
    'Марий Эл': { lat: 56.6344, lng: 47.8999 },
    'Калуга': { lat: 54.5385, lng: 36.2588 },
    'Калужская область': { lat: 54.5385, lng: 36.2588 },
    'Кострома': { lat: 57.7668, lng: 40.9268 },
    'Костромская область': { lat: 57.7668, lng: 40.9268 },
    'Курган': { lat: 55.4486, lng: 65.3391 },
    'Курганская область': { lat: 55.4486, lng: 65.3391 },
    'Псков': { lat: 57.8193, lng: 28.3318 },
    'Псковская область': { lat: 57.8193, lng: 28.3318 },
    'Тамбов': { lat: 52.7314, lng: 41.4465 },
    'Тамбовская область': { lat: 52.7314, lng: 41.4465 },
    'Абакан': { lat: 53.7225, lng: 91.4432 },
    'Республика Хакасия': { lat: 53.7225, lng: 91.4432 },
    'Хакасия': { lat: 53.7225, lng: 91.4432 },
    'Элиста': { lat: 46.3078, lng: 44.2558 },
    'Республика Калмыкия': { lat: 46.3078, lng: 44.2558 },
    'Калмыкия': { lat: 46.3078, lng: 44.2558 },
    'Черкесск': { lat: 44.2212, lng: 42.0578 },
    'Карачаево-Черкесская Республика': { lat: 44.2212, lng: 42.0578 },
    'Кызыл': { lat: 51.7000, lng: 94.4500 },
    'Республика Тыва': { lat: 51.7000, lng: 94.4500 },
    'Тыва': { lat: 51.7000, lng: 94.4500 },
    'Нарьян-Мар': { lat: 67.6380, lng: 53.0067 },
    'Ненецкий АО': { lat: 67.6380, lng: 53.0067 },
    'Ненецкий автономный округ': { lat: 67.6380, lng: 53.0067 },
    'Салехард': { lat: 66.5333, lng: 66.6000 },
    'Ямало-Ненецкий АО': { lat: 66.5333, lng: 66.6000 },
    'Ямало-Ненецкий автономный округ': { lat: 66.5333, lng: 66.6000 },
    'Ханты-Мансийск': { lat: 61.0000, lng: 69.0000 },
    'Ханты-Мансийский АО': { lat: 61.0000, lng: 69.0000 },
    'Ханты-Мансийский автономный округ': { lat: 61.0000, lng: 69.0000 },
    'Югра': { lat: 61.0000, lng: 69.0000 },
    'Набережные Челны': { lat: 55.7434, lng: 52.3958 },
    'Новороссийск': { lat: 44.7167, lng: 37.7667 },
    'Ставрополь': { lat: 45.0443, lng: 41.9686 },
    'Ставропольский край': { lat: 45.0443, lng: 41.9686 },
    'Магнитогорск': { lat: 53.4187, lng: 58.9778 },
    'Вологда': { lat: 59.2181, lng: 39.8886 },
    'Вологодская область': { lat: 59.2181, lng: 39.8886 },
    'Республика Коми': { lat: 61.6688, lng: 50.8360 },
    'Коми': { lat: 61.6688, lng: 50.8360 },
    'Республика Ингушетия': { lat: 43.1667, lng: 44.8000 },
    'Орёл': { lat: 52.9700, lng: 36.0700 },
    'Орловская область': { lat: 52.9700, lng: 36.0700 },
    'Донецкая Народная Республика': { lat: 48.0000, lng: 37.8000 },
    'Запорожская область': { lat: 47.8333, lng: 35.1667 },
};

function getCityCoords(names) {
    return names.map(name => {
        if (CITY_COORDS[name]) return CITY_COORDS[name];
        for (const [key, pos] of Object.entries(CITY_COORDS)) {
            if (name.includes(key) || key.includes(name)) return pos;
        }
        return null;
    });
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
