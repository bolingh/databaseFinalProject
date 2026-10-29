# Mini THSR 高鐵訂票系統

這是一份資料庫系統期末專題的起始範例。

## 專案內容

```text
.
├── frontend/                 # HTML、CSS、JavaScript 與 Nginx 容器
├── backend/                  # Flask + psycopg 後端範例
├── data/                     # 課程提供的 CSV
├── schema/schema.sql         # 資料庫建表 SQL
├── docker-compose.yml        # 一鍵啟動設定
└── .env.example              # 本機環境設定範本
```

目前的進度：

- 前端已提供車次查詢、訂票、訂單列表與訂單明細畫面。
- 後端提供 `GET /users`、`GET /stations` 與 `GET /schedules`，示範分層結構與參數化 SQL。
- 資料庫初始化會建立 ERD 的核心資料表，並從 `users.csv`、`stations.csv` 與 `timetable.csv` 匯入資料。
- 前端已透過 Nginx 串接正式的 `GET /users` 範例。
- 訂票與訂單功能尚未完成。

## 環境需求

建議使用以下環境：

- Windows 10/11、macOS 或常見 Linux 發行版
- Docker Desktop，或 Docker Engine 搭配 Docker Compose v2
- 可使用 `docker compose` 指令的終端機
- Chrome、Edge、Firefox 等現代瀏覽器

不需要在主機安裝 Python、PostgreSQL、Nginx 或前端套件。

啟動前請確認以下連接埠未被其他程式占用：

| 連接埠 | 服務 |
| --- | --- |
| `8080` | 前端網頁 |
| `8000` | 後端 API |
| `5432` | PostgreSQL |

## 一鍵啟動

第一次使用時，先在專案根目錄建立本機 `.env`。

Linux/macOS：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

`.env` 只供本機使用且已被 Git 忽略，請勿提交真實帳號或密碼。接著執行：

```bash
docker compose up --build
```

第一次執行會下載映像並建立容器，因此可能需要幾分鐘。看到服務啟動後，開啟：

- 前端：<http://localhost:8080>
- 後端 Users API：<http://localhost:8000/users>

Nginx 會將前端的 `/users` 與 `/stations` 請求代理到後端，因此右上角使用者選單與車站選單會載入 CSV 中的資料。車次與訂票尚未串接正式 API；首頁的 **Load Example Stations and Trains** 仍只用來預覽車次畫面。

## 停止與重置

在執行中的終端機按 `Ctrl+C`，再執行：

```bash
docker compose down
```

PostgreSQL 資料保存在 Docker volume。若要刪除資料並從 CSV 重新初始化：

```bash
docker compose down -v
docker compose up --build
```

`down -v` 會刪除本專案的資料庫 volume，請勿用在需要保留訂單資料的環境。

## 常用檢查

查看容器狀態：

```bash
docker compose ps
```

查看所有服務日誌：

```bash
docker compose logs -f
```

直接測試後端，不需要經過前端或 Nginx：

```bash
curl http://localhost:8000/users
```

## 開發方向

學生需依課程 API 規格完成資料表、CSV 匯入、車次查詢、區間座位判斷、訂票、訂單查詢、取消，以及交易與並行控制。請勿依公開資料寫死回應；評測時會替換 `data/` 內同名 CSV。

前端檔案與待串接位置的詳細說明請見 [`frontend/README.md`](frontend/README.md)。`frontend/examples/` 只包含清楚標示的 UI 展示資料，不會取代學生應完成的 API。

---

## 啟動步驟
```bash
docker compose up -d --build
```
前端在http://localhost:8080
## 環境要求