# PWA 使用说明

这个行程网页已经改成可安装的 Web App / PWA 格式。

## 包含文件
- `index.html`：主网页
- `manifest.webmanifest`：App 名称、图标、启动方式等设定
- `sw.js`：Service Worker，支持安装与离线缓存
- `icons/`：iPhone / Android 桌面图标

## 重要
Android Chrome 要出现“安装应用程式 / Add to Home screen”的 App 模式，网页需要通过 **HTTPS** 提供，或在 `localhost` 测试。直接用 `file://` 打开通常不能安装为真正 PWA。

iPhone Safari 可用“分享 → 加入主画面”，加入后会以无地址栏的独立 App 样式打开；同样建议通过 HTTPS 链接访问。

## 测试方式
本地电脑可在此文件夹执行：

```bash
python3 -m http.server 8080
```

然后用浏览器打开：

```text
http://localhost:8080/index.html
```

正式分享给手机使用时，请把整个文件夹上传到支持 HTTPS 的空间（例如 GitHub Pages、Netlify、Cloudflare Pages、自己的 HTTPS 网站）。
