# 小象部署 (Xiaoxiang Deploy)

一个基于 Cloudflare Workers + KV 的极简 HTML 托管平台。粘贴代码，即时生成可访问的 HTTPS 链接。

![小象部署](https://cdn.smallelephant.ccwu.cc/logo.jpg)

## 项目简介

将你的 HTML 代码粘贴进来，一键部署。生成全球 CDN 加速的短链接，无需 Git，无需构建，无需配置。

告别 GitHub Pages 的繁琐流程，从 `https://you.github.io/your-super-long-repo-name` 到 `https://host.smallelephant.ccwu.cc/s/you.html`，只差一次粘贴的距离。

## 功能特性

- **零配置部署**：粘贴 HTML 代码，点击生成即可
- **短链接**：随机 10 位 ID，或自定义短链接（至少 3 字符）
- **全球加速**：基于 Cloudflare 边缘网络
- **本地记录**：部署历史保存在浏览器本地，不同设备互不影响
- **404 跳转**：访问不存在的页面自动显示错误
- **完全免费**：无广告，无追踪

## 快速开始
### 手动部署

**步骤 1：创建 KV 命名空间**

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 左侧菜单选择 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**，命名为 `host`
4. 创建成功后，复制它的 **ID**（一串长字符）

**步骤 2：创建 Worker**

1. 进入 **Workers & Pages** → **Overview**
2. 点击 **Create Application** → **Workers** → **Create Worker**
3. 给 Worker 起个名字，部署

**步骤 3：绑定 KV**

1. 进入刚创建的 Worker 设置页
2. 选择 **Settings** → **Bindings** → **Add**
3. 选择 **KV Namespace**
4. 变量名填写 `host`（必须与代码中的 `KV_NAMESPACE` 一致）
5. 选择步骤 1 创建的 KV 命名空间

**步骤 4：粘贴代码**

1. 进入 Worker 的 **Edit Code** 页面
2. 将本项目中的 `worker.js` 代码完整粘贴进去
3. 点击 **Save and Deploy**

**步骤 5：完成**

访问你的 Worker 域名（`https://<worker-name>.<subdomain>.workers.dev`），即可开始使用。

## 立即体验

👉 [https://host.smallelephant.ccwu.cc](https://host.smallelephant.ccwu.cc)

## Worker 请求数据库需要什么？

本项目使用 **Cloudflare Workers KV** 作为存储。Worker 代码中通过绑定名称访问 KV：

```javascript
const kv = env.host;  // "host" 就是绑定名称
await kv.put(key, value);  // 写入
const html = await kv.get(key);  // 读取
