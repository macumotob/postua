document.addEventListener('DOMContentLoaded', () => {
    const methodEl = document.getElementById('method');
    const urlEl = document.getElementById('url');
    const sendBtn = document.getElementById('send');
    const responseEl = document.getElementById('response');
    const paramsTable = document.querySelector('#params-table tbody');
    const headersTable = document.querySelector('#headers-table tbody');
    const bodyText = document.getElementById('body-text');
    const historyList = document.getElementById('history-list');

    // Элементы аутентификации
    const authTypeEl = document.getElementById('auth-type');
    const basicSection = document.querySelector('.auth-section[data-auth="basic"]');
    const bearerSection = document.querySelector('.auth-section[data-auth="bearer"]');
    const apikeySection = document.querySelector('.auth-section[data-auth="apikey"]');

    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Переключение типа аутентификации
    authTypeEl.addEventListener('change', () => {
        document.querySelectorAll('.auth-section').forEach(sec => sec.style.display = 'none');
        if (authTypeEl.value === 'basic') basicSection.style.display = 'grid';
        if (authTypeEl.value === 'bearer') bearerSection.style.display = 'grid';
        if (authTypeEl.value === 'apikey') apikeySection.style.display = 'grid';
    });

    // Добавление строк в таблицы
    document.querySelectorAll('.add-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const table = document.querySelector(`#${btn.dataset.table}-table tbody`);
            const row = document.createElement('tr');
            row.innerHTML = `<td><input type="text"></td><td><input type="text"></td><td><button class="remove">×</button></td>`;
            table.appendChild(row);
            addRemoveListener(row.querySelector('.remove'));
        });
    });

    function addRemoveListener(btn) {
        btn.addEventListener('click', () => btn.parentElement.parentElement.remove());
    }
    document.querySelectorAll('.remove').forEach(addRemoveListener);

    // Получение параметров
    function getParams() {
        const params = new URLSearchParams();
        paramsTable.querySelectorAll('tr').forEach(row => {
            const key = row.querySelectorAll('input')[0]?.value.trim();
            const val = row.querySelectorAll('input')[1]?.value.trim();
            if (key) params.append(key, val);
        });
        return params;
    }

    // Получение заголовков
    function getHeaders() {
        const headers = {};
        headersTable.querySelectorAll('tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const keyEl = inputs[0] || row.cells[0];
            const valEl = inputs[1] || row.cells[1];
            const key = keyEl.value || keyEl.textContent;
            const val = valEl.value || valEl.textContent;
            if (key.trim()) headers[key.trim()] = val.trim();
        });
        return headers;
    }

    // Применение аутентификации
    function applyAuthentication(headers, params) {
        const type = authTypeEl.value;

        if (type === 'basic') {
            const username = document.getElementById('basic-username').value.trim();
            const password = document.getElementById('basic-password').value.trim();
            if (username || password) {
                const token = btoa(`${username}:${password}`);
                headers['Authorization'] = `Basic ${token}`;
            }
        } else if (type === 'bearer') {
            const token = document.getElementById('bearer-token').value.trim();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } else if (type === 'apikey') {
            const key = document.getElementById('apikey-key').value.trim();
            const value = document.getElementById('apikey-value').value.trim();
            const addTo = document.getElementById('apikey-addto').value;
            if (key && value) {
                if (addTo === 'header') {
                    headers[key] = value;
                } else if (addTo === 'query') {
                    params.append(key, value);
                }
            }
        }
    }

    // Отправка запроса
    async function sendRequest() {
        const method = methodEl.value;
        let url = urlEl.value.trim();

        let params = getParams();
        const headers = getHeaders();

        // Применяем аутентификацию
        applyAuthentication(headers, params);

        // Добавляем параметры в URL
        if (params.toString()) {
            url += (url.includes('?') ? '&' : '?') + params.toString();
        }

        let body = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (bodyText.value.trim()) {
                try {
                    body = JSON.parse(bodyText.value);
                } catch {
                    body = bodyText.value;
                    headers['Content-Type'] = 'text/plain';
                }
            }
        }

        responseEl.textContent = 'Загрузка...';

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            const text = await res.text();
            let pretty = text;
            try {
                const json = JSON.parse(text);
                pretty = JSON.stringify(json, null, 2);
            } catch {}

            responseEl.textContent = `Статус: ${res.status} ${res.statusText}\n\n${pretty}`;

            // Сохранение в историю
            saveToHistory({ method, url: urlEl.value });
        } catch (err) {
            responseEl.textContent = 'Ошибка: ' + err.message;
        }
    }

    sendBtn.addEventListener('click', sendRequest);

    // История запросов
    function saveToHistory(request) {
        let history = JSON.parse(localStorage.getItem('apiHistory') || '[]');
        history.unshift(request);
        history = history.slice(0, 20);
        localStorage.setItem('apiHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('apiHistory') || '[]');
        history.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.method} ${item.url}`;
            li.addEventListener('click', () => {
                methodEl.value = item.method;
                urlEl.value = item.url;
            });
            historyList.appendChild(li);
        });
    }

    renderHistory();
});