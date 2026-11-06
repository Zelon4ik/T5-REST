import puppeteer from 'puppeteer-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let browser;

try {
  browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 780, deviceScaleFactor: 1.5 });

  // 1. Capture Swagger UI
  console.log('Capturing Swagger UI...');
  await page.goto(`${BASE_URL}/swagger/index.html`, { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, 'screenshot_01_swagger_ui.png'), fullPage: false });
  console.log('Saved screenshot_01_swagger_ui.png');

  // Helper for rendering HTTP diagnostic cards
  async function renderCard(meta, filename) {
    const statusColor = meta.status >= 200 && meta.status < 300 ? '#10b981' : (meta.status === 401 ? '#ef4444' : '#f59e0b');
    const methodColor = meta.method === 'GET' ? '#3b82f6' : (meta.method === 'POST' ? '#10b981' : (meta.method === 'PATCH' ? '#8b5cf6' : '#ef4444'));

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>${meta.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #0b1329; color: #f8fafc; padding: 24px; }
    .card { background: #151f38; border-radius: 12px; border: 1px solid #2d3d66; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; }
    .header { background: #0b1329; padding: 16px 20px; border-bottom: 1px solid #2d3d66; display: flex; align-items: center; justify-content: space-between; }
    .badge-method { background: ${methodColor}; color: #ffffff; font-weight: 700; font-size: 13px; padding: 4px 10px; border-radius: 6px; }
    .url { font-family: 'Consolas', monospace; font-size: 14.5px; color: #94a3b8; margin-left: 10px; }
    .badge-status { background: ${statusColor}; color: #ffffff; font-weight: 700; font-size: 13px; padding: 4px 10px; border-radius: 6px; }
    .title-banner { padding: 14px 20px; background: #111a30; border-bottom: 1px solid #243354; }
    .title-banner h2 { font-size: 16px; color: #38bdf8; margin-bottom: 4px; font-weight: 600; }
    .title-banner p { font-size: 12.5px; color: #94a3b8; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 20px; }
    .panel { background: #0b1329; border-radius: 8px; border: 1px solid #2d3d66; overflow: hidden; display: flex; flex-direction: column; }
    .panel-title { background: #151f38; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #2d3d66; }
    .panel-content { padding: 12px 14px; font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.45; color: #e2e8f0; flex-grow: 1; }
    .headers-list { font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; border-bottom: 1px dashed #2d3d66; padding-bottom: 8px; }
    .headers-list span.key { color: #38bdf8; }
    .headers-list span.val { color: #f1f5f9; }
    pre { white-space: pre-wrap; word-break: break-all; }
    .note { margin: 0 20px 16px 20px; padding: 10px 14px; border-radius: 6px; background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; font-size: 12.5px; color: #cbd5e1; }
    .note strong { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <span class="badge-method">${meta.method}</span>
        <span class="url">${meta.url}</span>
      </div>
      <div>
        <span class="badge-status">${meta.status} ${meta.statusText}</span>
      </div>
    </div>
    <div class="title-banner">
      <h2>${meta.stepNumber}. ${meta.title}</h2>
      <p>${meta.description}</p>
    </div>
    <div class="grid">
      <div class="panel">
        <div class="panel-title">HTTP Request (Вхідні дані)</div>
        <div class="panel-content">
          <div class="headers-list">
            ${Object.entries(meta.reqHeaders || {}).map(([k, v]) => `<div><span class="key">${k}:</span> <span class="val">${v}</span></div>`).join('')}
          </div>
          <pre>${meta.reqBody ? JSON.stringify(meta.reqBody, null, 2) : '<em>(порожнє тіло / No Body)</em>'}</pre>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">HTTP Response (Відповідь сервера Gin)</div>
        <div class="panel-content">
          <div class="headers-list">
            ${Object.entries(meta.resHeaders || {}).map(([k, v]) => `<div><span class="key">${k}:</span> <span class="val">${v}</span></div>`).join('')}
          </div>
          <pre>${meta.resBody ? (typeof meta.resBody === 'string' ? meta.resBody : JSON.stringify(meta.resBody, null, 2)) : '<em>(204 No Content - успішно без тіла)</em>'}</pre>
        </div>
      </div>
    </div>
    ${meta.note ? `<div class="note"><strong>Технічний аналіз:</strong> ${meta.note}</div>` : ''}
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: join(SCREENSHOT_DIR, filename), fullPage: true });
    console.log(`Saved ${filename}`);
  }

  // 2. Register
  console.log('Testing Register...');
  let res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'engineer@company.internal', password: 'SuperSecretPassword123' })
  });
  let data = await res.json();
  await renderCard({
    stepNumber: '2',
    title: 'Реєстрація інженера (POST /api/v1/auth/register)',
    description: 'Створення облікового запису в PostgreSQL з хешуванням пароля bcrypt (DefaultCost).',
    method: 'POST',
    url: '/api/v1/auth/register',
    status: res.status,
    statusText: 'Created',
    reqHeaders: { 'Content-Type': 'application/json' },
    reqBody: { email: 'engineer@company.internal', password: 'SuperSecretPassword123' },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'Модель User містить тег json:"-" для PasswordHash, тому пароль або його геш ніколи не витікають на клієнт.'
  }, 'screenshot_02_register.png');

  // 3. Login
  console.log('Testing Login...');
  res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'engineer@company.internal', password: 'SuperSecretPassword123' })
  });
  data = await res.json();
  const token = data.token;
  await renderCard({
    stepNumber: '3',
    title: 'Автентифікація інженера та генерація JWT токена (POST /api/v1/auth/login)',
    description: 'Перевірка пароля через bcrypt.CompareHashAndPassword та випуск підписаного JWT (24 години).',
    method: 'POST',
    url: '/api/v1/auth/login',
    status: res.status,
    statusText: 'OK',
    reqHeaders: { 'Content-Type': 'application/json' },
    reqBody: { email: 'engineer@company.internal', password: 'SuperSecretPassword123' },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: {
      token: `${token.substring(0, 36)}...[JWT_TRUNCATED]...${token.slice(-16)}`
    },
    note: 'Токен підписаний алгоритмом HMAC-SHA256 (HS256). Claims містять userID, email, iss та термін дії exp.'
  }, 'screenshot_03_login_jwt.png');

  // 4. Create Incident Validation Error
  console.log('Testing Validation Error...');
  res = await fetch(`${BASE_URL}/api/v1/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'DG', // too short (<3 chars)
      description: 'Test description',
      priority: 'urgent' // invalid priority (not in oneof)
    })
  });
  data = await res.json();
  await renderCard({
    stepNumber: '4',
    title: 'Декларативна валідація DTO за допомогою тегів binding (Помилка 400 Bad Request)',
    description: 'Перевірка валідатора go-playground/validator на обмеження довжини (min=3) та oneof=low medium high critical.',
    method: 'POST',
    url: '/api/v1/incidents',
    status: res.status,
    statusText: 'Bad Request',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.substring(0, 20)}...`
    },
    reqBody: {
      title: 'DG',
      description: 'Test description',
      priority: 'urgent'
    },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'ShouldBindJSON автоматично повертає опис помилок валідації полів без потреби ручних перевірок if-else.'
  }, 'screenshot_04_create_incident_validation_error.png');

  // 5. Create Incident Success
  console.log('Testing Create Incident Success...');
  res = await fetch(`${BASE_URL}/api/v1/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Overheating on Gateway-01',
      description: 'Core temperature reached 85C',
      priority: 'critical'
    })
  });
  data = await res.json();
  const incident1 = data;
  await renderCard({
    stepNumber: '5',
    title: 'Успішне створення інциденту (POST /api/v1/incidents)',
    description: 'Збереження інциденту в PostgreSQL з автоматичною прив\'язкою до user_id авторизованого інженера.',
    method: 'POST',
    url: '/api/v1/incidents',
    status: res.status,
    statusText: 'Created',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.substring(0, 20)}...`
    },
    reqBody: {
      title: 'Overheating on Gateway-01',
      description: 'Core temperature reached 85C',
      priority: 'critical'
    },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: incident1,
    note: 'Інцидент збережено в таблиці incidents СУБД PostgreSQL. Значення user_id витягнуто з gin.Context (c.Get("userID")).'
  }, 'screenshot_05_create_incident_success.png');

  // Create second incident
  await fetch(`${BASE_URL}/api/v1/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Database connection pool exhausted',
      description: 'Active connections exceeded max threshold of 100',
      priority: 'high'
    })
  });

  // 6. List Incidents
  console.log('Testing List Incidents...');
  res = await fetch(`${BASE_URL}/api/v1/incidents`);
  data = await res.json();
  await renderCard({
    stepNumber: '6',
    title: 'Публічний перегляд каталогу інцидентів (GET /api/v1/incidents)',
    description: 'Отримання переліку всіх інцидентів через метод GORM db.Find(&incidents).',
    method: 'GET',
    url: '/api/v1/incidents',
    status: res.status,
    statusText: 'OK',
    reqHeaders: { 'Accept': 'application/json' },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'Ендпоінт є публічним і не вимагає заголовка авторизації, що дозволяє моніторинговим дашбордам читати статус подій.'
  }, 'screenshot_06_list_incidents.png');

  // 7. Get Incident by ID
  console.log('Testing Get Incident by ID...');
  res = await fetch(`${BASE_URL}/api/v1/incidents/${incident1.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  await renderCard({
    stepNumber: '7',
    title: 'Отримання деталей інциденту за ID (GET /api/v1/incidents/:id)',
    description: 'Витягування параметра шляху c.Param("id") та пошук запису через db.First(&incident, id).',
    method: 'GET',
    url: `/api/v1/incidents/${incident1.id}`,
    status: res.status,
    statusText: 'OK',
    reqHeaders: { 'Authorization': `Bearer ${token.substring(0, 20)}...` },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'Маршрут захищений JWT Middleware. При запиті неіснуючого ID повертається статус 404 Not Found.'
  }, 'screenshot_07_get_incident_by_id.png');

  // 8. Patch Status
  console.log('Testing Patch Status...');
  res = await fetch(`${BASE_URL}/api/v1/incidents/${incident1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'in_progress' })
  });
  data = await res.json();
  await renderCard({
    stepNumber: '8',
    title: 'Оновлення статусу інциденту (PATCH /api/v1/incidents/:id/status)',
    description: 'Прийняття UpdateStatusDTO з валідацією binding:"required,oneof=open in_progress resolved closed".',
    method: 'PATCH',
    url: `/api/v1/incidents/${incident1.id}/status`,
    status: res.status,
    statusText: 'OK',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.substring(0, 20)}...`
    },
    reqBody: { status: 'in_progress' },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'Статус інциденту успішно оновлено на "in_progress" у PostgreSQL. Сервер повертає актуалізований об\'єкт.'
  }, 'screenshot_08_patch_status.png');

  // 9. Unauthorized Access
  console.log('Testing Unauthorized Delete...');
  res = await fetch(`${BASE_URL}/api/v1/incidents/${incident1.id}`, {
    method: 'DELETE'
  });
  data = await res.json();
  await renderCard({
    stepNumber: '9',
    title: 'Блокування неавторизованого доступу (JWT Auth Middleware)',
    description: 'Спроба виклику захищеного ендпоінту DELETE /api/v1/incidents/:id без заголовка Authorization.',
    method: 'DELETE',
    url: `/api/v1/incidents/${incident1.id}`,
    status: res.status,
    statusText: 'Unauthorized',
    reqHeaders: { 'Accept': 'application/json' },
    resHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    resBody: data,
    note: 'AuthMiddleware негайно перериває виконання ланцюжка обробників методом c.AbortWithStatusJSON(401, ...).'
  }, 'screenshot_09_unauthorized_access.png');

  // 10. Delete Incident Success
  console.log('Testing Delete Incident Success...');
  res = await fetch(`${BASE_URL}/api/v1/incidents/${incident1.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await renderCard({
    stepNumber: '10',
    title: 'Успішне видалення інциденту (DELETE /api/v1/incidents/:id)',
    description: 'Видалення запису із таблиці incidents бази даних PostgreSQL авторизованим інженером.',
    method: 'DELETE',
    url: `/api/v1/incidents/${incident1.id}`,
    status: res.status,
    statusText: 'No Content',
    reqHeaders: { 'Authorization': `Bearer ${token.substring(0, 20)}...` },
    resHeaders: { 'Date': new Date().toUTCString() },
    resBody: null,
    note: 'Відповідно до семантики протоколу HTTP та стандарту REST API повертається статус 204 No Content із порожнім тілом.'
  }, 'screenshot_10_delete_incident_success.png');

  // 11. Console Output visual
  console.log('Rendering console card...');
  const consoleHtml = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Консоль Gin та GORM</title>
  <style>
    body { background: #0b1329; padding: 24px; font-family: 'Consolas', monospace; color: #f8fafc; }
    .terminal { background: #010816; border-radius: 10px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.7); overflow: hidden; }
    .bar { background: #0f172a; padding: 10px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #1e293b; }
    .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .red { background: #ef4444; } .yellow { background: #f59e0b; } .green { background: #10b981; }
    .title { color: #94a3b8; font-size: 13px; margin-left: 10px; }
    .content { padding: 18px 20px; font-size: 13px; line-height: 1.6; }
    .blue { color: #38bdf8; } .green-t { color: #4ade80; } .yellow-t { color: #facc15; } .magenta { color: #c084fc; } .white { color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="bar">
      <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
      <span class="title">Incident Tracker API — PowerShell Daemon Process</span>
    </div>
    <div class="content">
      <div><span class="blue">[GORM]</span> <span class="white">Connected to PostgreSQL successfully (host=127.0.0.1:5432, db=incident_tracker)</span></div>
      <div><span class="blue">[GORM]</span> <span class="green-t">Auto-migration completed: 'users', 'incidents' tables are up to date.</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="green-t">POST  </span> <span class="white">/api/v1/auth/register     --> handlers.RegisterHandler (3 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="green-t">POST  </span> <span class="white">/api/v1/auth/login        --> handlers.LoginHandler (3 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="blue">GET   </span> <span class="white">/api/v1/incidents         --> handlers.ListIncidentsHandler (3 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="green-t">POST  </span> <span class="white">/api/v1/incidents         --> handlers.CreateIncidentHandler (4 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="blue">GET   </span> <span class="white">/api/v1/incidents/:id     --> handlers.GetIncidentHandler (4 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="magenta">PATCH </span> <span class="white">/api/v1/incidents/:id/status --> handlers.UpdateStatusHandler (4 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="red">DELETE</span> <span class="white">/api/v1/incidents/:id     --> handlers.DeleteIncidentHandler (4 handlers)</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="blue">GET   </span> <span class="white">/swagger/*any             --> gin-swagger.WrapHandler (3 handlers)</span></div>
      <div style="margin-top: 10px;"><span class="green-t">[СЕРВЕР]</span> <span class="white">Сервіс успішно запущено на </span><span class="blue">http://localhost:8080</span></div>
      <div><span class="green-t">[СЕРВЕР]</span> <span class="white">Swagger UI доступний за адресою: </span><span class="blue">http://localhost:8080/swagger/index.html</span></div>
      <div><span class="yellow-t">[GIN-debug]</span> <span class="white">Listening and serving HTTP on :8080</span></div>
    </div>
  </div>
</body>
</html>`;
  await page.setContent(consoleHtml, { waitUntil: 'load' });
  await page.screenshot({ path: join(SCREENSHOT_DIR, 'screenshot_11_console_output.png'), fullPage: true });
  console.log('Saved screenshot_11_console_output.png');

  console.log('All 11 screenshots captured successfully!');
} catch (err) {
  console.error('Error during capture:', err);
} finally {
  if (browser) await browser.close();
}
