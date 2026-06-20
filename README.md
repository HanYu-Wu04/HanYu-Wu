# HanYu Wu Portfolio

[English](#english) | [中文](#中文)

## English

An unofficial, open-source portfolio replica and interaction study inspired by [landonorris.com](https://landonorris.com/). The original Lando Norris site uses a bold motorsport editorial style, scroll-led storytelling, large media moments, custom lettering, signature graphics, and highly animated page transitions. This project recreates that kind of experience as a personal portfolio for HanYu Wu, with custom assets, WebGL effects, weather particles, project-gallery sections, and static deployment through Vite.

This project is not affiliated with Lando Norris, McLaren, or the official Lando Norris website. It is a portfolio build and front-end experiment.

## Features

- WebGL portrait reveal using Three.js and custom GLSL shaders.
- Fluid distortion trail that reveals and distorts `base.png` / `top.png`.
- Interactive 3D ice/wireframe face mask that follows the portrait crop.
- Snow/rain particle toggle with cursor wake interaction.
- Hidden `iceman` keyboard easter egg that swaps the portrait reveal to `ice.png`.
- Browser console branding that prints `HanYu Wu`.
- Lando Norris-style pixel text hover/reveal effect.
- Scroll-driven signature, manifesto, gallery, and contact transitions.
- Responsive desktop and mobile layouts.
- Static Vite build with no backend server.

## Libraries Used

- React 19: UI rendering.
- Vite 6: local dev server and static production build.
- TypeScript: type checking.
- Tailwind CSS 4: utility-first styling.
- Three.js: WebGL scene, shader materials, render targets, and 3D mask geometry.
- Motion: scroll transforms, animated transitions, and reveal effects.
- Lucide React: weather, resume, and menu icons.

## Custom Project Files

- `src/components/FluidDistortion.tsx`: Main portfolio experience. Owns scroll timing, hero portrait WebGL setup, manifesto, gallery, contact section, weather toggle, and responsive behavior.
- `src/consoleBrand.ts`: Browser console signature that prints HanYu Wu branding on page load.
- `src/shaders.ts`: Custom GLSL shaders for the fluid trail simulation and display pass.
- `src/components/SnowfallCanvas.tsx`: Lightweight canvas snow/rain particle system with cursor-driven wake interaction and mobile performance caps.
- `src/components/LandoText.tsx`: Custom Lando Norris-inspired text hover effect used for nav, resume text, and brand lettering.
- `src/components/Stroke.tsx`: SVG signature renderer. The signature path was generated with [stroke.abhii.space](https://stroke.abhii.space/) and then integrated through custom source code from that generated path.
- `src/components/MenuOverlay.tsx`: Full-screen animated navigation overlay with weather background and preview imagery.
- `src/components/LoadingOverlay.tsx`: Initial loading transition.
- `src/index.css`: Tailwind import, font setup, global utility classes, and procedural snow-field background styling.

## Project Structure

```text
.
├── public/                     # Static assets, images, favicon, resume PDF
├── src/
│   ├── App.tsx                 # App shell
│   ├── main.tsx                # React entrypoint
│   ├── index.css               # Tailwind import, fonts, global utilities
│   ├── shaders.ts              # Fluid and display fragment shaders
│   └── components/
│       ├── FluidDistortion.tsx # Main portfolio experience
│       ├── LoadingOverlay.tsx  # Initial loading transition
│       ├── LandoText.tsx       # Lando-style animated text helper
│       ├── MenuOverlay.tsx     # Navigation overlay
│       ├── SnowfallCanvas.tsx  # Snow/rain particle canvas
│       └── Stroke.tsx          # SVG signature stroke
├── vite.config.ts              # Vite config
└── package.json                # Scripts and dependencies
```

## Run Locally

Requirements:

- Node.js 20 or newer.
- npm.

Install dependencies:

```bash
npm install
```

Run the Vite dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Scripts

- `npm run dev`: Start the Vite dev server.
- `npm run lint`: Run TypeScript type checking with `tsc --noEmit`.
- `npm run build`: Build the static frontend into `dist/`.
- `npm run preview`: Preview the built static app locally with Vite.
- `npm run clean`: Remove generated build output.

## Deploy

Build the app:

```bash
npm run build
```

Deploy the generated `dist/` folder as a static site. On Vercel, use:

- Build command: `npm run build`
- Output directory: `dist`

## Asset Notes

- `base.png`: Base portrait image.
- `top.png`: Ice/reveal portrait image.
- `ice.png`: Hidden easter egg portrait used after typing `iceman`.
- `left.png` and `right.png`: Contact section artwork.
- `HanYu_Wu_Resume.pdf`: Resume download target.
- Project images such as `calpoly.jpg`, `sparkliai.png`, `hack4impact.png`, `campusirl.png`, and `grad.jpg`.

Keep these paths stable unless you also update `src/components/FluidDistortion.tsx`.

## Verification

Before committing changes, run:

```bash
npm run lint
npm run build
```

The current build may warn that some chunks are larger than 500 kB. That warning is expected for the current Three.js/React bundle and does not fail the build.

## 中文

这是一个非官方、开源的个人作品集项目，灵感来自 [landonorris.com](https://landonorris.com/)。Lando Norris 官方网站有很强的赛车视觉语言、滚动叙事、大图媒体、定制字体效果、签名图形和大量动效。本项目把这种交互风格改造成 HanYu Wu 的个人作品集，并使用自定义素材、WebGL 效果、天气粒子、项目画廊和 Vite 静态部署来实现。

本项目与 Lando Norris、McLaren 或 Lando Norris 官方网站没有任何官方关联。它只是一个前端练习和个人作品集项目。

## 功能

- 使用 Three.js 和自定义 GLSL shader 实现 WebGL 人像揭示效果。
- 使用流体轨迹来揭示和扭曲 `base.png` / `top.png`。
- 交互式 3D 冰霜/线框面部结构，会随着人像裁切比例保持对齐。
- 雪/雨粒子切换，并支持鼠标轨迹推动粒子。
- 隐藏的 `iceman` 键盘彩蛋，输入后会把人像 reveal 切换到 `ice.png`。
- 浏览器 console 会打印 `HanYu Wu` 品牌字样。
- 类 Lando Norris 风格的像素文字 hover/reveal 效果。
- 滚动驱动的签名、宣言、项目画廊和联系区。
- 桌面端和移动端响应式布局。
- 纯静态 Vite 构建，没有后端服务器。

## 使用的库

- React 19：UI 渲染。
- Vite 6：本地开发服务器和静态生产构建。
- TypeScript：类型检查。
- Tailwind CSS 4：工具类样式。
- Three.js：WebGL 场景、shader material、render target 和 3D mask。
- Motion：滚动动画、转场和 reveal 效果。
- Lucide React：天气、简历和菜单图标。

## 自定义文件

- `src/components/FluidDistortion.tsx`：主作品集页面，包含滚动时间轴、WebGL hero、人像、manifesto、gallery、contact、天气切换和响应式逻辑。
- `src/consoleBrand.ts`：页面加载时在浏览器 console 打印 HanYu Wu 品牌字样。
- `src/shaders.ts`：自定义 GLSL shader，用于流体轨迹模拟和最终画面显示。
- `src/components/SnowfallCanvas.tsx`：轻量 canvas 雪/雨粒子系统，支持鼠标推动和移动端性能限制。
- `src/components/LandoText.tsx`：类 Lando Norris 的文字 hover 动效。
- `src/components/Stroke.tsx`：SVG 签名渲染组件。签名路径通过 [stroke.abhii.space](https://stroke.abhii.space/) 生成，再把网站生成的 source code 集成到项目中。
- `src/components/MenuOverlay.tsx`：全屏导航 overlay，带天气背景和图片预览。
- `src/components/LoadingOverlay.tsx`：初始加载动画。
- `src/index.css`：Tailwind 引入、字体、全局工具类和 procedural snow-field 背景。

## 本地运行

要求：

- Node.js 20 或更新版本。
- npm。

安装依赖：

```bash
npm install
```

启动 Vite 开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:5173
```

## 常用命令

- `npm run dev`：启动 Vite 开发服务器。
- `npm run lint`：运行 TypeScript 类型检查。
- `npm run build`：构建静态前端到 `dist/`。
- `npm run preview`：本地预览构建后的静态网站。
- `npm run clean`：删除构建输出。

## 部署

构建项目：

```bash
npm run build
```

把生成的 `dist/` 文件夹部署到任意静态网站平台即可。Vercel 配置：

- Build command：`npm run build`
- Output directory：`dist`

## 验证

提交前建议运行：

```bash
npm run lint
npm run build
```

当前构建可能会提示部分 chunk 大于 500 kB，这是 Three.js/React bundle 的体积警告，不会导致构建失败。
