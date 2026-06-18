# 西湖春天·粤菜 — 扫码文化页 Demo

移动端单页演示，供店家扫码体验。招牌菜区域使用 React Bits 的 InfiniteMenu 3D 旋转菜单。

## 本地预览

需要先安装依赖，再启动开发服务器：

```bash
cd demo
npm install
npm run dev
```

浏览器会自动打开：http://localhost:5173

> 注意：InfiniteMenu 依赖 React + WebGL，不能再用 `python -m http.server` 直接打开 `index.html`。

## 生产构建

```bash
npm run build
npm run preview
```

构建产物在 `dist/` 目录。

## 手机扫码预览

1. 确保手机和电脑在同一 Wi-Fi
2. 运行 `npm run dev -- --host`
3. 查电脑局域网 IP（如 `192.168.1.100`）
4. 手机访问：`http://192.168.1.100:5173`

## 目录结构

```
demo/
├── index.html              # 主页面
├── package.json            # 依赖与脚本
├── vite.config.js          # Vite 配置
├── src/
│   ├── menu-entry.jsx      # InfiniteMenu 挂载入口
│   └── components/
│       ├── InfiniteMenu.jsx
│       └── InfiniteMenu.css
├── css/style.css           # 页面样式
├── js/                     # 原生交互脚本
└── images/                 # 图片素材
```

## 说明

- 创办故事为 demo 虚构文案，围绕「西湖 + 粤菜」主题编写
- 菜品图从菜单截图中提取，正式版建议替换为独立高清图
- 电话链接为占位，请替换为真实号码
