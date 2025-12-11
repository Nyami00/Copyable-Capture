# 📸 Copyable Capture

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-00C853)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Webページを魚拓としてHTML/Markdownファイルで保存できるChrome拡張機能

## ✨ 機能

- **🖱️ ワンクリック保存** - 拡張機能アイコンをクリックするだけ
- **📄 デュアルフォーマット** - HTML と Markdown 両方で保存
- **🖼️ 画像ダウンロード** - ページ内の画像も一緒に保存
- **📁 自動整理** - ドメイン別にフォルダを自動作成
- **🔗 オフライン対応** - 画像リンクをローカルパスに自動変換

## 📥 インストール

### 手動インストール（開発者モード）

1. このリポジトリをクローン
   ```bash
   git clone https://github.com/yourusername/Copyable-Capture.git
   ```

2. Chromeで `chrome://extensions` を開く

3. 右上の「**デベロッパーモード**」を有効化

4. 「**パッケージ化されていない拡張機能を読み込む**」をクリック

5. クローンしたフォルダを選択

## 🚀 使い方

1. 保存したいWebページを開く
2. ツールバーの **Copyable Capture** アイコンをクリック
3. 保存オプションを設定
   - 📁 保存先フォルダ名
   - ☑️ HTML / Markdown
   - ☑️ 画像も保存
4. 「**ページを保存**」ボタンをクリック

## 📂 保存先の構造

```
Downloads/
└── Copyable-Capture/          # カスタマイズ可能
    └── example.com/           # ドメイン別
        └── ページタイトル/
            ├── page.html      # HTMLファイル
            ├── page.md        # Markdownファイル
            └── images/        # 画像フォルダ
                ├── image_1.jpg
                ├── image_2.png
                └── ...
```

## ⚙️ 技術仕様

| 項目 | 内容 |
|------|------|
| Manifest Version | V3 |
| 必要な権限 | `activeTab`, `downloads`, `storage`, `scripting` |
| Markdown変換 | [Turndown.js](https://github.com/mixmark-io/turndown) |

## 🔒 プライバシー

- 外部サーバーへのデータ送信は一切行いません
- すべての処理はローカルで完結します
- 収集するデータはありません

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

Issue や Pull Request は大歓迎です！

1. Fork する
2. Feature branch を作成 (`git checkout -b feature/amazing-feature`)
3. Commit する (`git commit -m 'Add amazing feature'`)
4. Push する (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📜 変更履歴

### v1.1.0
- 🖼️ 画像ダウンロード機能を追加
- 🔗 HTMLファイル内の画像リンクをローカルパスに自動変換
- 📊 ダウンロード進捗表示

### v1.0.0
- 🎉 初回リリース
- 📄 HTML/Markdown保存機能
- 📁 自動フォルダ整理機能
