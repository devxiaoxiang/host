const FILE_LENGTH = 10;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 32;
const KV_NAMESPACE = 'host';
const META_KEY = '__deploy_meta__';
const SLUG_REGEX = /^[a-z0-9-]+$/;
function generateRandomName() {
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
let name = '';
for (let i = 0; i < FILE_LENGTH; i++) {
name += chars[Math.floor(Math.random() * chars.length)];
}
return name;
}
async function generateUniqueName(kv) {
for (let attempts = 0; attempts < 100; attempts++) {
const name = generateRandomName();
const exists = await kv.get(name);
if (!exists) return name;
}
throw new Error('目录已满');
}
function jsonResponse(data) {
return new Response(JSON.stringify(data), {
headers: { 'Content-Type': 'application/json' }
});
}
export default {
async fetch(request, env, ctx) {
const url = new URL(request.url);
const kv = env[KV_NAMESPACE];
if (url.pathname.startsWith('/s/')) {
const id = url.pathname.replace('/s/', '').replace('.html', '');
if (!id || id.includes('/') || id.includes('..') || id === META_KEY) {
return Response.redirect('/', 302);
}
const html = await kv.get(id);
if (!html) {
return Response.redirect('/', 302);
}
return new Response(html, {
headers: {
'Content-Type': 'text/html; charset=utf-8',
'Cache-Control': 'public, max-age=300'
}
});
}
if (request.method === 'POST' && url.pathname === '/api/delete') {
const formData = await request.formData();
const id = formData.get('id');
if (!id || id === META_KEY) {
return jsonResponse({ success: false, error: '无效ID' });
}
await kv.delete(id);
return jsonResponse({ success: true });
}
if (request.method === 'POST' && url.pathname === '/') {
const formData = await request.formData();
const action = formData.get('action');
const html = formData.get('html') || '';
let slug = (formData.get('slug') || '').trim().toLowerCase();
if (slug.endsWith('.html')) {
slug = slug.slice(0, -5);
}
if (action !== 'deploy') {
return jsonResponse({ success: false, error: '无效操作' });
}
if (!html.trim()) {
return jsonResponse({ success: false, error: '请输入 HTML 代码' });
}
let filename;
if (slug) {
if (!SLUG_REGEX.test(slug)) {
return jsonResponse({ success: false, error: '自定义链接只能包含 a-z、0-9、-' });
}
if (slug.length < MIN_SLUG_LENGTH) {
return jsonResponse({ success: false, error: `自定义链接至少 ${MIN_SLUG_LENGTH} 个字符` });
}
if (slug.length > MAX_SLUG_LENGTH) {
return jsonResponse({ success: false, error: `自定义链接最多 ${MAX_SLUG_LENGTH} 个字符` });
}
if (slug === META_KEY) {
return jsonResponse({ success: false, error: '该名称被系统保留' });
}
const exists = await kv.get(slug);
if (exists) {
return jsonResponse({ success: false, error: '该链接已被占用，请换一个' });
}
filename = slug;
} else {
try {
filename = await generateUniqueName(kv);
} catch (e) {
return jsonResponse({ success: false, error: e.message });
}
}
let finalHtml = html;
const lower = html.toLowerCase();
if (!lower.includes('<html') && !lower.includes('<!doctype')) {
finalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小象部署</title>
</head>
<body>
${html}
</body>
</html>`;
}
await kv.put(filename, finalHtml);
const protocol = url.protocol;
const host = url.host;
const fileUrl = `${protocol}//${host}/s/${filename}.html`;
return jsonResponse({
success: true,
url: fileUrl,
filename: filename + '.html',
size: finalHtml.length,
isCustom: !!slug
});
}
return new Response(HTML_PAGE, {
headers: { 'Content-Type': 'text/html; charset=utf-8' }
});
}
};
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小象部署</title>
<link rel="icon" href="https://icc.gt.tc/xiaoxiangimage/logo.jpg">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:24px}
.header{text-align:center;padding:40px 0 24px}
.logo{width:72px;height:72px;border-radius:16px;margin-bottom:16px;object-fit:cover;box-shadow:0 4px 20px rgba(99,102,241,0.15)}
.title{font-size:32px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}
.subtitle{color:#64748b;font-size:15px}
.editor-wrap{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:24px 0;transition:all .3s;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.editor-wrap:focus-within{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
.editor-header{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0}
.dot{width:12px;height:12px;border-radius:50%}
.dot-red{background:#ef4444}
.dot-yellow{background:#eab308}
.dot-green{background:#22c55e}
.editor-title{color:#64748b;font-size:13px;font-family:'SF Mono',Monaco,monospace;margin-left:4px}
textarea{width:100%;min-height:280px;padding:16px;background:transparent;border:none;color:#334155;font-family:'SF Mono',Monaco,'Cascadia Code',monospace;font-size:14px;line-height:1.6;resize:vertical;outline:none}
textarea::placeholder{color:#94a3b8}
.slug-wrap{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:16px 0;display:flex;align-items:center;gap:4px;transition:all .3s}
.slug-wrap:focus-within{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
.slug-prefix{color:#94a3b8;font-family:'SF Mono',monospace;font-size:14px;white-space:nowrap}
.slug-input{flex:1;border:none;background:transparent;color:#334155;font-family:'SF Mono',monospace;font-size:14px;outline:none;min-width:0}
.slug-input::placeholder{color:#94a3b8}
.slug-suffix{color:#94a3b8;font-family:'SF Mono',monospace;font-size:14px;white-space:nowrap}
.slug-hint{color:#94a3b8;font-size:12px;margin-top:-8px;margin-bottom:16px;padding-left:4px}
.btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-deploy{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 4px 20px rgba(99,102,241,0.25)}
.btn-deploy:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,0.4)}
.btn-deploy:disabled{opacity:.6;cursor:not-allowed;transform:none}
.records-section{margin-top:40px}
.records-title{font-size:20px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.record-list{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.record-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #f1f5f9;transition:all .2s}
.record-item:last-child{border-bottom:none}
.record-item:hover{background:#f8fafc}
.record-info{flex:1;min-width:0}
.record-id{font-family:'SF Mono',monospace;font-size:13px;color:#6366f1;font-weight:600}
.record-meta{color:#94a3b8;font-size:12px;margin-top:2px}
.record-badge{font-size:11px;padding:2px 8px;border-radius:6px;background:#e0e7ff;color:#4f46e5;font-weight:600;margin-left:6px}
.record-actions{display:flex;gap:6px}
.record-btn{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:none}
.btn-open{background:#f1f5f9;color:#475569;text-decoration:none}
.btn-open:hover{background:#e2e8f0}
.btn-copy{background:#f1f5f9;color:#475569}
.btn-copy:hover{background:#e2e8f0}
.btn-delete{background:#fef2f2;color:#ef4444}
.btn-delete:hover{background:#fee2e2}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px;animation:fadeIn .2s ease}
.modal-overlay.active{display:flex}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:#fff;border-radius:20px;padding:40px 32px;max-width:440px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);animation:scaleIn .3s ease}
@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
.modal-icon{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 20px rgba(99,102,241,0.3)}
.modal-icon svg{width:32px;height:32px;color:#fff}
.modal-title{font-size:22px;font-weight:700;color:#1e293b;margin-bottom:8px}
.modal-desc{color:#64748b;font-size:14px;margin-bottom:24px}
.modal-url{display:flex;gap:8px;margin-bottom:24px}
.modal-url input{flex:1;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;color:#6366f1;font-family:'SF Mono',monospace;font-size:13px;outline:none}
.modal-url button{padding:14px 16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;color:#475569;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
.modal-url button:hover{background:#e2e8f0}
.modal-url button svg{width:18px;height:18px}
.modal-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
.modal-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(99,102,241,0.35)}
.modal-btn svg{width:18px;height:18px}
.modal-meta{color:#94a3b8;font-size:12px;margin-top:16px;font-family:'SF Mono',monospace}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);padding:12px 28px;background:#22c55e;color:white;border-radius:12px;font-weight:600;font-size:14px;opacity:0;transition:all .3s;z-index:1001;box-shadow:0 4px 20px rgba(34,197,94,.3)}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.error{background:#ef4444;box-shadow:0 4px 20px rgba(239,68,68,.3)}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:18px;height:18px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .8s linear infinite}
.footer{text-align:center;padding:40px 0 24px;color:#94a3b8;font-size:13px}
@media(max-width:640px){.title{font-size:26px}.modal{padding:32px 24px}}
</style>
</head>
<body>
<div class="container">
<div class="header">
<img src="https://icc.gt.tc/xiaoxiangimage/logo.jpg" class="logo" alt="小象部署">
<h1 class="title">小象部署</h1>
<p class="subtitle">粘贴 HTML 代码，一键生成 HTTPS 链接</p>
</div>
<div class="editor-wrap">
<div class="editor-header">
<span class="dot dot-red"></span>
<span class="dot dot-yellow"></span>
<span class="dot dot-green"></span>
<span class="editor-title">index.html</span>
</div>
<textarea id="code" placeholder="<!DOCTYPE html>
<html>
<head>
<title>我的页面</title>
</head>
<body>
<h1>Hello World</h1>
</body>
</html>"></textarea>
</div>
<div class="slug-wrap">
<span class="slug-prefix">/s/</span>
<input type="text" class="slug-input" id="slugInput" placeholder="你的名字（至少3个字符）" maxlength="32">
<span class="slug-suffix">.html</span>
</div>
<div class="slug-hint">留空则自动生成随机链接。仅支持 a-z、0-9、-，至少3个字符</div>
<button class="btn btn-deploy" id="deployBtn" onclick="deploy()">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
<polyline points="17 8 12 3 7 8"/>
<line x1="12" y1="3" x2="12" y2="15"/>
</svg>
<span id="btnText">生成链接</span>
</button>
<div class="records-section" id="recordsSection" style="display:none">
<div class="records-title">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#6366f1">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
<polyline points="14 2 14 8 20 8"/>
<line x1="16" y1="13" x2="8" y2="13"/>
<line x1="16" y1="17" x2="8" y2="17"/>
<polyline points="10 9 9 9 8 9"/>
</svg>
部署记录
</div>
<div class="record-list" id="recordList"></div>
</div>
<div class="footer">小象部署 · 稳定 · 高效 · 可靠的网站托管服务</div>
</div>
<div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
<div class="modal" onclick="event.stopPropagation()">
<div class="modal-icon">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="20 6 9 17 4 12"/>
</svg>
</div>
<div class="modal-title">部署成功</div>
<div class="modal-desc" id="modalDesc">您的页面已生成，点击下方按钮访问</div>
<div class="modal-url">
<input type="text" id="modalUrl" readonly>
<button onclick="copyUrl()" title="复制链接">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>
</button>
</div>
<a class="modal-btn" id="modalOpenBtn" href="#" target="_blank">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
<polyline points="15 3 21 3 21 9"/>
<line x1="10" y1="14" x2="21" y2="3"/>
</svg>
打开链接
</a>
<div class="modal-meta" id="modalMeta"></div>
</div>
</div>
<div class="toast" id="toast"></div>
<script>
const STORAGE_KEY = 'deploy_records';
let currentUrl='';
function getFullUrl(path) {
return window.location.origin + path;
}
function getRecords() {
try {
return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch { return []; }
}
function saveRecords(records) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function renderRecords() {
const records = getRecords();
const section = document.getElementById('recordsSection');
const list = document.getElementById('recordList');
if (records.length === 0) {
section.style.display = 'none';
return;
}
section.style.display = 'block';
list.innerHTML = '';
records.forEach(item => {
const div = document.createElement('div');
div.className = 'record-item';
const time = new Date(item.time).toLocaleString('zh-CN');
const customBadge = item.isCustom ? '<span class="record-badge">自定义</span>' : '';
const fullUrl = getFullUrl('/s/' + item.id + '.html');
const displayName = item.id + '.html';
div.innerHTML = \`
<div class="record-info">
<div>
<span class="record-id">\${displayName}</span>
\${customBadge}
</div>
<div class="record-meta">\${time} · \${formatSize(item.size)}</div>
</div>
<div class="record-actions">
<a class="record-btn btn-open" href="\${fullUrl}" target="_blank">打开</a>
<button class="record-btn btn-copy" onclick="copyText('\${fullUrl}')">复制</button>
<button class="record-btn btn-delete" onclick="deleteRecord('\${item.id}')">删除</button>
</div>
\`;
list.appendChild(div);
});
}
function addRecord(id, filename, size, isCustom) {
const records = getRecords();
records.unshift({
id: id,
filename: filename,
size: size,
time: new Date().toISOString(),
isCustom: isCustom
});
saveRecords(records);
renderRecords();
}
async function deleteRecord(id) {
if (!confirm('确定要删除 "' + id + '.html" 吗？')) return;
try {
const form = new FormData();
form.append('id', id);
const res = await fetch('/api/delete', { method: 'POST', body: form });
const data = await res.json();
if (data.success) {
let records = getRecords();
records = records.filter(item => item.id !== id);
saveRecords(records);
renderRecords();
showToast('删除成功');
} else {
showToast(data.error || '删除失败', 'error');
}
} catch (e) {
showToast('删除失败: ' + e.message, 'error');
}
}
function copyText(text) {
navigator.clipboard.writeText(text);
showToast('链接已复制');
}
async function deploy() {
const code = document.getElementById('code').value.trim();
if (!code) { showToast('请输入 HTML 代码', 'error'); return; }
const btn = document.getElementById('deployBtn');
const btnText = document.getElementById('btnText');
btn.disabled = true;
btnText.innerHTML = '<span class="spinner"></span> 部署中...';
try {
const form = new FormData();
form.append('action', 'deploy');
form.append('html', code);
let slug = document.getElementById('slugInput').value.trim().toLowerCase();
if (slug.endsWith('.html')) {
slug = slug.slice(0, -5);
}
if (slug) form.append('slug', slug);
const res = await fetch('', { method: 'POST', body: form });
const data = await res.json();
if (data.success) {
currentUrl = data.url;
document.getElementById('modalUrl').value = data.url;
document.getElementById('modalOpenBtn').href = data.url;
document.getElementById('modalMeta').textContent = data.filename + ' · ' + formatSize(data.size);
document.getElementById('modalDesc').textContent = data.isCustom ? '自定义链接部署成功！' : '您的页面已生成，点击下方按钮访问';
document.getElementById('modalOverlay').classList.add('active');
showToast('部署成功！');
document.getElementById('slugInput').value = '';
const id = data.filename.replace('.html','');
addRecord(id, data.filename, data.size, data.isCustom);
} else {
showToast(data.error || '部署失败', 'error');
}
} catch (e) {
showToast('网络错误: ' + e.message, 'error');
} finally {
btn.disabled = false;
btnText.textContent = '生成链接';
}
}
function closeModal(e) {
if (e.target === document.getElementById('modalOverlay')) {
document.getElementById('modalOverlay').classList.remove('active');
}
}
function copyUrl() {
if (currentUrl) {
navigator.clipboard.writeText(currentUrl);
showToast('链接已复制到剪贴板');
}
}
function showToast(msg, type) {
const toast = document.getElementById('toast');
toast.textContent = msg;
toast.className = 'toast' + (type === 'error' ? ' error' : '');
toast.classList.add('show');
setTimeout(() => toast.classList.remove('show'), 2500);
}
function formatSize(bytes) {
if (bytes < 1024) return bytes + ' B';
if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
renderRecords();
</script>
</body>
</html>`;
