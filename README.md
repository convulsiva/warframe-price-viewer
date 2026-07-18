# Warframe Price Viewer

Desktop app for checking Warframe market prices, saving favorite items, and getting price alerts.

Available for macOS and Windows through GitHub Releases.

<p align="center"><strong>created by convulsiva &lt;3</strong></p>

---

## Русский

### Что это

Warframe Price Viewer — это desktop-приложение для быстрого просмотра цен на предметы Warframe через данные warframe.market.

Программа помогает:

- искать предметы;
- смотреть актуальные sell и buy лоты;
- видеть продавцов online / ingame;
- быстро сравнивать цены;
- добавлять предметы в Favorites;
- задавать price alerts для избранных предметов;
- получать системные уведомления на macOS и Windows;
- копировать whisper-команду продавцу в игре.

### Установка

1. Открой страницу Releases в GitHub.
2. Скачай файл для своей системы:
   - macOS: `.dmg`
   - Windows: `.exe`
3. Установи и запусти приложение.

### macOS

1. Скачай `.dmg`.
2. Открой файл.
3. Перетащи `Warframe Price Viewer.app` в Applications.
4. Запусти приложение.

Если macOS предупреждает, что приложение скачано из интернета, открой его через:

```text
Right click -> Open
```

### Windows

1. Скачай `.exe`.
2. Запусти installer.
3. Следуй обычной установке.
4. После установки открой Warframe Price Viewer.

### Как пользоваться

1. Введи название предмета в поле поиска.
2. Выбери предмет из списка.
3. Смотри текущие лоты, цены, статус продавцов и количество.
4. Используй фильтры, если нужно уточнить список лотов.
5. Нажми `Save`, чтобы добавить предмет в Favorites.

### Favorites и уведомления

В Favorites у каждого предмета есть два поля:

- `Drop <=`
- `Rise >=`

Они работают по цене в platinum, не по процентам.

Пример:

- если в `Drop <=` написать `7`, уведомление придет, когда ingame-продавец выставит цену `7 platinum` или ниже;
- если в `Rise >=` написать `20`, уведомление придет, когда подходящая цена станет `20 platinum` или выше.

Уведомления учитывают только ingame-продавцов.

Если несколько разных продавцов одновременно подходят под условие, приложение может отправить несколько уведомлений. При этом один и тот же продавец с той же ценой не будет бесконечно спамить уведомлениями.

### Copy whisper

В sell-лотах рядом с ником продавца есть кнопка `Copy`.

Она копирует команду:

```text
/w {seller} Hi! I want to buy: "{item}" for {price} platinum. (warframe.market)
```

Такую же команду можно скопировать через уведомление.

### Close to tray

В Settings есть настройка `Close to tray`.

Если она включена, закрытие окна не завершает программу полностью. Приложение скрывается в трей и продолжает мониторить Favorites и отправлять уведомления.

---

## English

### What is this

Warframe Price Viewer is a desktop app for checking Warframe item prices using warframe.market data.

It helps you:

- search tradable items;
- view live sell and buy orders;
- see online and ingame sellers;
- compare prices quickly;
- save favorite items;
- set price alerts for favorites;
- receive native desktop notifications on macOS and Windows;
- copy an in-game whisper command for sellers.

### Installation

1. Open the GitHub Releases page.
2. Download the file for your system:
   - macOS: `.dmg`
   - Windows: `.exe`
3. Install and run the app.

### macOS

1. Download the `.dmg`.
2. Open it.
3. Drag `Warframe Price Viewer.app` into Applications.
4. Launch the app.

If macOS warns that the app was downloaded from the internet, open it with:

```text
Right click -> Open
```

### Windows

1. Download the `.exe`.
2. Run the installer.
3. Follow the setup flow.
4. Open Warframe Price Viewer after installation.

### How to use

1. Type an item name into the search field.
2. Select an item from the results.
3. View current orders, prices, seller status, and quantity.
4. Use filters if you want to narrow down the order list.
5. Press `Save` to add the item to Favorites.

### Favorites and alerts

Each favorite item has two alert fields:

- `Drop <=`
- `Rise >=`

They use exact platinum prices, not percentages.

Example:

- if `Drop <=` is set to `7`, you get a notification when an ingame seller lists the item for `7 platinum` or lower;
- if `Rise >=` is set to `20`, you get a notification when the matching price reaches `20 platinum` or higher.

Alerts only use ingame sellers.

If multiple different sellers match the condition at the same time, the app can send multiple notifications. The same seller at the same price will not spam repeated notifications forever.

### Copy whisper

Sell orders have a `Copy` button next to the seller name.

It copies this command:

```text
/w {seller} Hi! I want to buy: "{item}" for {price} platinum. (warframe.market)
```

The same command can also be copied from a price notification.

### Close to tray

The Settings panel includes `Close to tray`.

When enabled, closing the window hides the app to the tray instead of fully quitting it. Favorites monitoring and notifications continue running in the background.

---

## For Developers

### Stack

- React
- TypeScript
- Vite
- Tauri 2
- Zustand
- TanStack Query
- Vitest
- Playwright

### Setup

```bash
npm install
```

### Run web dev server

```bash
npm run dev
```

### Run desktop app locally

```bash
npm run tauri:dev
```

### Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
```

### Build frontend

```bash
npm run build
```

### Build desktop bundles

```bash
npm run tauri:build
```

For a local macOS app and DMG:

```bash
npm run tauri:build -- --bundles app,dmg
```

Windows installers are built on Windows runners through GitHub Actions.

### Notes

- The app uses warframe.market data.
- Desktop notifications are native through Tauri/Rust.
- Clipboard copy is handled through the desktop app when running in Tauri.
- Release builds are published through GitHub Releases.
