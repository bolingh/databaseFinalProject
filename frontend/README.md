# Mini THSR 前端使用說明

## 1. 各個檔案怎麼分工？

| 檔案 | 負責的工作 |
| --- | --- |
| `index.html` | 車次查詢頁：乘車日期、起迄站、選填時間，以及車次結果表格。 |
| `booking.html` | 訂票頁：顯示所選車次，提供票數、座位偏好、連號欄位與訂票結果區。 |
| `bookings.html` | 訂單概覽頁：提供訂單編號查詢欄位，顯示目前使用者的訂單列表。 |
| `booking-detail.html` | 訂單詳情頁：顯示單筆訂單的全部資料，以及取消訂單按鈕。 |
| `css/style.css` | 四頁共用的外觀：顏色、字體、欄位排列、按鈕、表格與手機排版。 |
| `js/config.js` | 使用者 API 的網址及讀取逾時時間。 |
| `js/main.js` | 四頁共用的操作：讀使用者、保存選擇、讀欄位、切換座位需求、顯示資料及 API 接線位置。 |

HTML 決定畫面上放什麼，CSS 決定怎麼排列，JavaScript 處理操作與資料。這七個檔案不包含後端程式或資料庫。

### 檔名與位置要放對

建立一個 `frontend` 資料夾，照下表放置，`frontend` 這個資料夾名稱可以自行更改，裡面的相對位置要維持一致。

| 下載時可能出現的檔名 | 整理後的位置 |
| --- | --- |
| `index.html` | `frontend/index.html` |
| `booking.html` | `frontend/booking.html` |
| `bookings.html` | `frontend/bookings.html` |
| `booking-detail.html` | `frontend/booking-detail.html` |
| `style.css` | `frontend/css/style.css` |
| `config.js` | `frontend/js/config.js` |
| `main.js` | `frontend/js/main.js` |

在 `frontend` 裡建立 `css`、`js` 兩個資料夾；四個 HTML 放在 `frontend` 裡，CSS 放進 `css`，兩個 JavaScript 放進 `js`。本 README 可以放在 `frontend` 裡，與 `index.html` 同一層。

HTML 引用的是 `css/style.css`、`js/config.js`、`js/main.js`；導覽連結也使用沒有括號編號的 HTML 檔名。

## 2. 執行前要準備什麼？

### 先看畫面、測試前端操作

準備：

1. 整理好的七個檔案。
2. Chrome、Edge 等支援 JavaScript 的瀏覽器。
3. Docker Desktop，或 Docker Engine 搭配 Docker Compose v2。

這份前端不需要執行 `npm install`，也不需要前端建置工具。正式範例由 Nginx 容器提供靜態檔案。

### 要讓使用者選單有資料

除了以上準備，還需要可用的使用者列表 API。目前 `config.js` 設定為：

```js
usersUrl: "/users"
```

意思是向「目前網頁所在網站的 `/users`」讀資料。

例如網頁開在 `http://localhost:8080/`，就會向 `http://localhost:8080/users` 發出請求。範例 Nginx 已將這個路徑代理到 `backend:8000/users`，所以不需修改前端網址或設定 CORS。

若提供的使用者 API 在其他網址，可將 `config.js` 的 `usersUrl` 改成對應完整網址。來源或連接埠不同時，後端還需要允許跨來源讀取（CORS）；這部分請與後端確認。

### 要真的查車次與訂票

需要提供對應 API，並完成 `main.js` 中的 TODO 接線。只有後端端點存在，還不夠；目前前端也尚未呼叫它們。

## 3. 啟動網頁步驟

1. 啟動 Docker Desktop，等待 Docker 可使用。
2. 開啟終端機，切換到包含 `docker-compose.yml` 的專案根目錄。不要在 `frontend/` 目錄內執行。
3. 執行：

```bash
docker compose up --build frontend
```

4. 保持終端機開著。看到服務啟動後，在瀏覽器手動開啟：

```text
http://localhost:8080/
```

5. 確認頁面有樣式，且右上角的使用者選單能載入姓名。這表示 Nginx 已提供前端，`/users` 也已成功連到後端。

若要在背景執行，不持續占用目前的終端機：

```bash
docker compose up -d --build frontend
```

查看啟動狀態與日誌：

```bash
docker compose ps
docker compose logs -f frontend backend
```

使用者選單會呼叫正式後端的 `GET /users`。首頁的 **Load Example Stations and Trains**、訂票頁的 **Show Example Result** 與訂單明細頁的 **Show Example Booking Details** 只載入 `examples/ui-example.js` 中的畫面展示資料，不會呼叫車站、車次或訂票 API，也不會保存訂單。

四個頁面的網址：

| 頁面 | 網址 |
| --- | --- |
| 車次查詢 | `http://localhost:8080/index.html` |
| 訂票 | `http://localhost:8080/booking.html` |
| 訂單概覽 | `http://localhost:8080/bookings.html` |
| 訂單詳情 | `http://localhost:8080/booking-detail.html` |

可以用頁面上方的導覽列切換，不需要每次手動輸入網址。

### 要停止時

回到執行啟動指令的終端機，按 `Ctrl+C`。服務停止後，已載入的頁面可能仍留在瀏覽器中，但重新載入或讀取 API 時，已停止的服務就無法回應。

### 啟動後什麼結果是正常的？

| 你看到的現象 | 原因 |
| --- | --- |
| 有頁面、排版、英文按鈕 | 前端檔案已載入。 |
| `Unable to load users.` | 沒有可用的 `/users` API，或 API 連線／回應有問題。 |
| 車站只有 `Select a station` | 車站 API 尚未接線，程式沒有塞入固定車站。 |
| 車次或訂單顯示 `No data available` | 目前沒有取得對應資料。 |
| `Booking is not available yet.` 等提示 | 目前的功能仍保留 TODO，尚未實際呼叫 API。 |

## 4. 所有頁面共用的操作

### Current User：目前使用者

頁面開啟時，`main.js` 的 `loadUsers()` 會向設定的 API 讀取名單。

- 載入完成後，在右上角選擇使用者。
- 選單顯示姓名，程式保存的是 `user_id`。
- 換頁或重新整理後，只要使用同一個網站來源、瀏覽器允許儲存，而且編號仍在名單裡，就會還原選擇。
- 選回 `Select a user`，就清除目前選擇。
- 名單讀取失敗時，不會另外加入假使用者。

`Reload` 表示重新向 API 讀取使用者名單，適合失敗後重試。它不是重置資料庫，也不會取消訂單。

### 四個導覽連結

| 英文名稱 | 中文用途 |
| --- | --- |
| `Train Search` | 車次查詢 |
| `Book Tickets` | 訂票 |
| `Booking Overview` | 訂單概覽 |
| `Booking Details` | 訂單詳情 |

直接點 `Book Tickets` 或 `Booking Details` 只會換頁，不會替你選好車次或訂單。通常需要先從上一頁的資料列表選擇。

## 5. 四個頁面如何操作？

### A. Train Search：車次查詢

欄位的意思：

| 欄位 | 怎麼填 |
| --- | --- |
| `Travel Date` | 必填，可用瀏覽器日期選擇器；送出值為 `YYYY-MM-DD`，範圍為 2026-12-01 至 2027-01-31。 |
| `Departure Station` | 起站。接上車站 API 後，才會有選項。 |
| `Arrival Station` | 迄站。接上車站 API 後，才會有選項。 |
| `Earliest Departure Time` | 選填，最早出發時間；留空不限。 |
| `Latest Departure Time` | 選填，最晚出發時間；留空不限。 |

接線完成後的操作順序：

1. 選乘車日期、起站與迄站。
2. 有需要再填時間範圍。起迄站不能相同，最早時間不能晚於最晚時間。
3. 按 `Search Trains`。
4. 在結果表查看車次、出發時間、抵達時間與可用座位數。
5. 按該列的 `Book This Train`，把所選車次資料帶進訂票頁。

### B. Book Tickets：訂票

正常流程是從車次列表按 `Book This Train` 進入。這樣網址才會帶入車次號碼、日期、起迄站與時間。

如果直接開 `booking.html`，沒有帶參數，`Selected Train` 顯示 `No data available` 是正常的。

欄位操作：

| 欄位 | 目前行為 |
| --- | --- |
| `Number of Tickets` | 必填，接受 1～5 的整數；預設 1。 |
| `Seat Preference` | 單張可輸入 `window`（靠窗）、`aisle`（靠走道），或留空。 |
| `Adjacent Seats` | 2～5 張可自行勾選是否要求連號。 |

這份是有欄位限制的版本：

- 1 張：可以填偏好；連號會取消並停用。
- 2～5 張：偏好會清空並停用；連號可以勾或不勾，不會自動勾選。
- 在 2～5 張之間切換：保留連號勾選。
- 多張改回 1 張：清除連號，偏好恢復可輸入；之前被清掉的文字不會自動恢復。

偏好文字框沒有字串白名單，單張仍可以輸入 `abc`、`WINDOW` 等內容。合法性由後端判斷；目前尚未接 API，所以不會真的得到後端的合法性回應。整理資料時，未填或只有空白的偏好會成為 `null`，其他非空白文字保留原文。

接線完成後，按 `Confirm Booking` 會送出需求，結果放在 `Booking Result`。配位、剩餘座位與失敗原因由後端決定，前端負責顯示。

### C. Booking Overview：訂單概覽

接線完成後：

1. 先在 `Current User` 選擇要查的使用者。
2. `Booking ID` 留空，代表查他的全部訂單，包含已取消的訂單。
3. 如果只想查某筆，就輸入訂單編號。
4. 按 `Search Bookings`。
5. 在結果列表點訂單編號或該列的 `View Details`，進入詳情頁。

結果可能是多筆、一筆或空列表；空列表不一定是程式出錯，也可能是沒有符合的訂單。

### D. Booking Details：訂單詳情

正常流程是從訂單列表選一筆，讓網址帶有 `booking_id`。

接線完成後，可查看使用者、車次、乘車區間、時間、票數、全部座位、偏好與連號達成結果，以及訂單狀態。

- `Back to Booking Overview`：返回概覽。
- `Cancel Booking`：要求後端取消整筆訂單。
- 一筆訂單有多張票時，取消以整筆為單位，不是只取消其中一張。
- 後端取消成功後，才能顯示已取消與釋出座位；歷史訂單仍保留。

## 6. 之後接 API，要找哪裡？

在 `js/main.js` 搜尋 `TODO`。TODO 表示待完成的程式位置，註解本身不會執行。

| 功能 | 主要位置 | 收到資料後使用的顯示工具 |
| --- | --- | --- |
| 使用者名單（已呼叫） | `loadUsers()`，網址在 `config.js` | 函式內建立使用者選項 |
| 車站 | `initializeSearch()` 的 GET /stations TODO | `renderStations(response)` |
| 車次 | `initializeSearch()` 的 GET /schedules TODO | `renderSchedules(response, params)` |
| 訂票 | `initializeBooking()` 的 POST /bookings TODO | `renderBookingResult(response)` |
| 訂單列表 | `initializeBookings()` 的 GET /bookings TODO | `renderBookings(response)` |
| 單筆詳情 | `prepareDetailLookup()` 的 GET /bookings TODO | `renderBookingDetails(response)` |
| 取消 | `initializeDetail()` 的 POST /bookings/{booking_id}/cancel TODO | `renderBookingDetails([response])` |

`collectSearch()`、`collectBookingRequest()`、`collectBookingsQuery()` 負責整理輸入；`render...` 負責顯示。它們本身不代表已經發出 API 請求。

訂票與訂單操作應使用目前選到的 `user_id`，不要固定寫某個人的編號。API 請求、回應、失敗提示等接線工作，需要依正式提供的格式完成，不是只把 TODO 改成網址就好。

本版的 `adjacent` 是前端草稿欄位。正式接線前要確認後端是否接受這個名稱。這份介面採「多張可選連號」的規則；原 PDF 的多張強制連號要求不同，需先確認組內採用的正式規格。

## 7. 現在就能做的前端檢查

這些不需要真正建立訂單：

| 操作 | 應看到什麼 |
| --- | --- |
| 點四個導覽連結 | 四頁都能開，版面與樣式正常。 |
| 訂票頁選 1 張 | 偏好可輸入，連號未勾且停用。 |
| 單張先填 window，再改 2 張 | 偏好清空並停用，連號可操作。 |
| 2 張勾連號，再改 5 張 | 保持勾選。 |
| 改回 1 張 | 連號清除並停用。 |
| 單張輸入 abc | 能輸入；目前不會收到後端判斷結果。 |
| 票數留空、0、6 或 1.5，按確認 | 瀏覽器阻止正常表單送出。 |
| 開訂票頁但未帶車次 | 所選車次顯示空資料提示。 |
| 沒有使用者 API | 顯示載入失敗，選單不加入假名單。 |

若已提供使用者 API，再測：選一位使用者，切換四頁並重新整理，應保留選擇；選回提示選項後換頁，應維持未選擇。

這些是前端檢查，不等於已驗證真實配位、取消或資料庫交易。

## 8. 常見問題

### 頁面有字，但沒有顏色或排列？

確認 `style.css` 放在 `css` 資料夾，沒有附加括號編號。CSS 路徑錯誤時，HTML 仍可能顯示，但外觀不同。

### 按導覽後找不到頁面？

確認四個 HTML 都在同一層，名稱是 `index.html`、`booking.html`、`bookings.html`、`booking-detail.html`。

### 看到 Users API returned HTTP 404？

代表 Nginx 無法連到正式後端、後端尚未啟動，或 `GET /users` 回應失敗。使用 `docker compose logs frontend backend` 查看原因。
