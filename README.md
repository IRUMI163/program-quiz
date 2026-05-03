# PROGRAM QUIZ - Professional Peak Edition

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Tech](https://img.shields.io/badge/tech-Vanilla_JS_/_PHP-orange.svg)

洗練された **Glassmorphism** デザインを採用した、超高速・多機能なプログラミングクイズ・アプリケーションです。
フロントエンドは依存関係のない Vanilla JavaScript で構築され、バックエンドはランキングシステムをサポートする PHP で動作します。

## 特徴

- **モダンな UI/UX**: 美しいグラスモルフィズムデザインとスムーズなアニメーション（Confetti.js 搭載）。
- **豊富なカテゴリ**: JavaScript, CSS, HTML, Python, TypeScript, React, Git, Linux, Network, SQL, Security, Algorithm など多岐にわたるジャンル。
- **難易度システム**: Lv.1 (Beginner) から Lv.5 (Maniac) までの 5 段階設定。
- **多言語対応**: 日本語と英語をシームレスに切り替え可能。
- **世界ランキング**: 全世界のユーザーとスコアを競えるグローバルランキング機能。
- **PWA 対応**: オフライン対応、ホーム画面へのインストールが可能。
- **パフォーマンス重視**: 高度なキャッシュ戦略とゼロレイテンシを目指したチューニング。
- **動的スコアリング**: 回答時間とコンボ数、難易度に基づいた高度なスコア計算アルゴリズム。

## スコアシステム

本アプリのスコアは以下の要素で決定されます：
- **基本点**: 100点 / 問
- **タイムボーナス**: 残り秒数(小数点以下含む) × 10
- **コンボボーナス**: 連続正解数 × 10（2問目以降）
- **難易度倍率**: Lv.1(1.0x) 〜 Lv.5(3.0x)

**理論上の最高スコア**: **7,620点** (Lv.5, 全問即答)

## 技術スタック

### Frontend
- **HTML5 / CSS3**: 変数（CSS Variables）とモダンなレイアウト。
- **Vanilla JavaScript**: ES Modules を使用した疎結合なアーキテクチャ。
- **PWA**: Service Worker によるアセットキャッシュ。

### Backend
- **PHP 8.x**: RESTful な API サーバー。
- **MySQL**: ランキングデータの永続化。

## セットアップ

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd School
```

### 2. バックエンド設定
`api/.env.example` を `api/.env` にコピーし、データベース情報を編集します。

```bash
cp api/.env.example api/.env
```

`.env` の内容例:
```ini
DB_HOST=localhost
DB_NAME=program_quiz
DB_USER=your_user
DB_PASS=your_password
```

### 3. データベースの初期化
MySQL でデータベースを作成し、以下の構造でテーブルを準備します（`api/ranking.php` のロジックに基づく）。
- `quiz_rankings` テーブル: `id`, `player_name`, `score`, `difficulty`, `created_at` (自動付与)

### 4. 実行
PHP が動作するウェブサーバー（Apache/Nginx）のドキュメントルートに配置してアクセスしてください。

## ディレクトリ構成

```text
.
├── index.html          # エントリポイント
├── manifest.json       # PWA 設定
├── sw.js               # Service Worker
├── css/
│   └── style.css       # メインスタイル
├── js/
│   ├── app.js          # メインロジック
│   ├── api.js          # API 通信
│   ├── components.js   # Web Components / UI 部品
│   ├── lang.js         # 翻訳データ
│   ├── data/           # 各カテゴリのクイズデータ (JSON)
│   └── ...
└── api/
    ├── .env            # データベース接続情報（ローカル）
    ├── .env.example    # 環境設定のサンプル
    ├── .htaccess       # セキュリティ設定
    ├── config.php      # DB 設定 / 定数定義
    └── ranking.php     # ランキング API
```

## 🌐 デプロイ
このプロジェクトは **Lolipop** などのレンタルサーバーや一般的な PHP ホスティング環境に最適化されています。`.htaccess` によるセキュリティ設定が含まれており、公開環境でも安全に動作します。

## 📄 ライセンス
[MIT License](LICENSE)

---
Developed by **[IRUMI](https://irumi-portfolio.vercel.app/)**
