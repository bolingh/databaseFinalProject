# Mini THSR Backend

本專案為資料庫系統期末專題「Mini THSR 高鐵訂票系統」的後端範例，以 **Flask + PostgreSQL** 實作，示範從「建表 → 匯入 CSV → 查詢 → 提供 API」的完整流程。

範例目前僅實作「查詢使用者」功能，其餘 API ( 車站列表、車次查詢、訂票、訂單查詢與取消 ) 請依作業規格自行實作。

## Tech Stack

| 項目     | 使用                       |
| -------- | -------------------------- |
| 語言     | Python 3.12                |
| 框架     | Flask                      |
| 資料庫   | PostgreSQL 17              |
| DB 驅動  | psycopg 3                  |
| 套件管理 | uv                         |
| 格式化   | Ruff                       |
| 容器     | Docker + Docker Compose    |

## Project Structure

```text
DB_FinalProject/
├── .env.example               # 環境變數範本（複製為本機 .env）
├── docker-compose.yml         # 定義 db、db-init、backend 三個服務
├── schema/
│   └── schema.sql             # 建表 SQL
├── data/
│   └── users.csv              # 使用者初始資料
└── backend/
    ├── Dockerfile             # 後端映像檔：Python 環境、安裝套件、啟動指令
    ├── pyproject.toml         # 專案設定：相依套件、Ruff 設定
    ├── uv.lock                # uv 鎖定的套件版本
    ├── .python-version        # 指定 Python 版本 (uv 使用)
    ├── run.py                 # 後端進入點：啟動 Flask
    ├── db_init.py             # 資料庫初始化：建表 + 匯入 CSV
    └── app/
        ├── __init__.py        # create_app()：建立並設定 Flask app
        ├── core/
        │   ├── config.py      # 讀取 .env 與路徑設定
        │   └── database.py    # 建立資料庫連線
        ├── api/               # 路由層：定義 API 端點 (Blueprint)
        │   ├── __init__.py    # 註冊所有 Blueprint
        │   └── users.py       # /users 路由
        ├── services/          # 商業邏輯層：組合 repository、轉換回應格式
        │   └── user_service.py
        ├── repositories/      # 資料存取層：撰寫與執行 SQL
        │   └── user_repository.py
        └── responses/         # API 回應格式定義
            └── user.py
```

### Request Flow

```text
HTTP 請求 → api（路由）→ services（商業邏輯）→ repositories（SQL）→ PostgreSQL
                                   ↓
HTTP 回應 ← api（轉 JSON）← responses（回應格式）
```

## Prerequisites

開始前請先安裝以下工具。

### uv

uv 是以 Rust 撰寫的 Python 套件管理工具，安裝速度遠快於 pip，只需一個工具即可管理 Python 版本、虛擬環境 ( `.venv` ) 與套件依賴 ( `pyproject.toml` )。

uv 會依 `.python-version` 自動下載對應版本的 Python ( **不需另外安裝 Python** ) 並建立虛擬環境，再依 `uv.lock` 安裝鎖定版本的套件，確保每個人的開發環境一致。

**Windows ( PowerShell )**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

安裝後重新開啟終端機，確認：

```bash
uv --version
```

常用指令（在 `backend/` 執行）：

| 指令                       | 用途                                       |
| -------------------------- | ------------------------------------------ |
| `uv sync`                  | 依 `uv.lock` 建立 `.venv` 並安裝 |
| `uv run <指令>`            | 在專案虛擬環境中執行指令                   |
| `uv add <套件>`            | 新增套件 ( 更新 `pyproject.toml` 與 `uv.lock` ) |
| `uv add --dev <套件>`      | 新增開發用套件                             |
| `uv remove <套件>`         | 移除套件                                   |
| `uv lock --upgrade`        | 升級所有套件並更新 `uv.lock`               |

### Docker

Docker 是一個容器化平台，能將應用程式與其執行環境 ( 語言版本、系統套件、相依套件 ) 一併打包成獨立的容器。容器與本機彼此隔離，在容器內安裝任何軟體都不會影響本機設定；所需的執行環境也已預先打包在容器中，省去繁瑣的安裝與環境配置。

Docker Compose 用於同時管理多個容器。本專案以 `Dockerfile` 定義後端映像檔的建置方式，並以 `docker-compose.yml` 定義各服務的映像檔版本與啟動方式。

**Windows / macOS**

安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/) ( 已內含 Compose；Windows 需啟用 WSL 2 )，安裝後需**開啟 Docker Desktop** 才能使用。

**Linux**

```bash
curl -fsSL https://get.docker.com | sh       # 安裝 Docker Engine 與 Compose plugin
sudo usermod -aG docker $USER                # 免 sudo 執行 docker，重新登入後生效
```

安裝後確認：

```bash
docker --version
docker compose version
```

常用指令 ( 在專案根目錄執行 )：

| 指令                          | 用途                                 |
| ----------------------------- | ------------------------------------ |
| `docker compose up --build`   | 建置映像檔並啟動所有服務             |
| `docker compose up -d`        | 在背景啟動服務                       |
| `docker compose ps -a`        | 查看服務狀態                         |
| `docker compose logs -f <服務>` | 查看指定服務的 log                 |
| `docker compose stop`         | 停止服務，保留資料                   |
| `docker compose down -v`      | 移除容器與資料庫資料 ( 重置 )        |

## Getting Started

### Run with Docker

在專案根目錄執行：

```bash
docker compose up --build
```

啟動後會依序執行三個服務：`db` ( PostgreSQL ) → `db-init` 建表並匯入 CSV → `backend` ( Flask API ) 。修改後端程式碼或套件後，需加上 `--build` 重新建置映像檔。

| 服務       | 網址                                                              |
| ---------- | ----------------------------------------------------------------- |
| Backend        | <http://localhost:8000/>                                     |
| PostgreSQL | <localhost:5432> |

### Run with local uv

開發時建議只用 Docker 啟動資料庫，後端改在本機以 uv 執行。如此一來，修改程式碼後不需重新建置映像檔，Flask 偵測到檔案變更也會自動重新載入。

```bash
docker compose up -d db-init     # 啟動 db 並完成初始化，不啟動 backend 容器
cd backend
uv sync                          # 安裝套件
uv run python run.py             # 啟動後端
```

- 可用 `docker compose logs db-init` 確認初始化結果 ( `database initialized` 或 `already initialized, skip` )
- 結束時按 `Ctrl + C` 停止後端，再於專案根目錄執行 `docker compose stop` 停止資料庫

### Configuration (`.env`)

`.env` 位於**專案根目錄**，是唯一的設定來源：本機執行的後端、`docker-compose.yml` 的 `${...}` 與後端容器都從這裡讀取。第一次使用請先執行 `cp .env.example .env` 建立本機設定。

| 變數          | 預設值      | 說明                                     |
| ------------- | ----------- | ---------------------------------------- |
| `DEBUG`       | `true`      | Flask 除錯模式（ 自動重新載入、詳細錯誤頁 ） |
| `LOG_LEVEL`   | `INFO`      | 最低 log 等級                            |
| `DB_HOST`     | `localhost` | 資料庫主機    |
| `DB_PORT`     | `5432`      | 資料庫對外開放的連接埠 |
| `DB_NAME`     | `mini_thsr` | 資料庫名稱                               |
| `DB_USER`     | `postgres`  | 帳號                                     |
| `DB_PASSWORD` | `postgres`  | 密碼                                     |

> [!WARNING]
> `.env` 通常包含帳號、密碼等敏感資訊，已由專案根目錄的 `.gitignore` 排除。請提交 `.env.example` 作為設定範本，不要提交本機 `.env`。

## Data Initialization

第一次啟動時，`db-init` 會自動執行 `schema/schema.sql` 建表，並匯入 `data/` 中的 CSV 檔案。整個過程包在同一個交易裡，任一步驟失敗即全部 rollback。若資料表已存在則略過初始化，不會重複匯入。

### CSV Files

`users.csv` 與 `stations.csv` 放在專案根目錄的 `data/` 資料夾，第一列欄位名稱須分別符合對應資料表，編碼使用 UTF-8。`timetable.csv` 是寬格式資料，會由 `db_init.py` 動態拆成 `train_services`、`service_operating_days` 與 `service_stops`；其車站欄位會從 CSV 標題列讀取，不依賴固定車站代碼或車次。座位不使用 CSV：每個車次的 `cars` 會產生 4 排、A 到 E 五個座位，A/E 分類為 `window`、C/D 分類為 `aisle`、B 分類為 `middle`。

### Add a New Table

1. 在 `schema/schema.sql` 加入 `CREATE TABLE`
2. 如果資料是一般直式 CSV，放到 `data/<資料表名稱>.csv`
3. 如果資料需要拆解或轉換，於 `db_init.py` 撰寫專用匯入函式
4. 重置資料庫並重新啟動

### Reset Database

由於初始化只在資料表尚未建立時執行，更換 CSV、修改 `schema.sql` 或 `.env` 中的資料庫帳密後，需清空資料庫重新初始化：

```bash
docker compose down -v
docker compose up
```

## Development Workflow

本範例已實作 `GET /users`，新增其他 API 時可參考它的寫法，依照下表的分層建立對應的檔案。

目前另有 `GET /stations` 與 `GET /schedules`。車次查詢接受 `date`、`from_station_id`、`to_station_id`，以及選填的 `departure_time_from`、`departure_time_to`；回應包含 `train_no`、`date`、`departure_time`、`arrival_time` 與 `remain_seats`。`remain_seats` 會依 `seat_positions` 的實際配置及已售票數計算，尚未建立座位配置時為 0。座位占用以乘車區間為範圍；同一車次的同一座位可以由不重疊區間的訂單重複使用。

### Example: `GET /users`

回傳所有使用者 ( 依 `user_id` 排序 )，供前端下拉選單切換目前使用者：

```json
[
  { "user_id": "U001", "name": "王小明" },
  { "user_id": "U002", "name": "陳小華" }
]
```

各層對應的檔案與職責如下：

| 層級         | 檔案                                                                        | 職責                                         |
| ------------ | --------------------------------------------------------------------------- | -------------------------------------------- |
| Response     | [`responses/user.py`](app/responses/user.py)                                | 以 dataclass 定義回應欄位 `user_id`、`name`  |
| Repository   | [`repositories/user_repository.py`](app/repositories/user_repository.py)   | 撰寫執行 SQL：`SELECT ... FROM users`      |
| Service      | [`services/user_service.py`](app/services/user_service.py)                 | 取得連線、呼叫 repository，將結果轉成回應格式 |
| API          | [`api/users.py`](app/api/users.py)                                          | 定義路由 `GET /users`，回傳 JSON             |
| Register     | [`api/__init__.py`](app/api/__init__.py)                                    | 註冊 `blueprint`，讓 Flask 載入 `/users` 路由  |

### Format with Ruff

Ruff 是 Python 的程式碼格式化與檢查工具，已列在本專案 `pyproject.toml` 的開發用依賴 ( `dev` group ) 中，執行 `uv sync` 時會一併安裝。提交程式碼前，請在 `backend/` 執行：

```bash
uv run ruff check --fix .     # 檢查程式碼並自動修正 ( 含 import 排序 )
uv run ruff format .          # 格式化程式碼
```

規則設定位於 `pyproject.toml` 的 `[tool.ruff]`。如果使用 VS Code 開發，可安裝 [Ruff 擴充套件](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff)，並在 `settings.json` 加入以下設定，存檔時自動格式化：

```json
"[python]": {
  "editor.defaultFormatter": "charliermarsh.ruff",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.organizeImports": "explicit"
  }
}
```
