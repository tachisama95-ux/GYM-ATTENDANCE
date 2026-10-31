/* =========================================
   IRON GYM LỊCH TẬP
========================================= */


/* -----------------------------------------
   Dữ liệu dùng chung
----------------------------------------- */

function readJSON(key, fallback) {

    try {

        const raw = localStorage.getItem(key);

        return raw ? JSON.parse(raw) : fallback;

    }

    catch (error) {

        return fallback;

    }

}


const currentUser =
    readJSON("gymCurrentUser", null);


if (!currentUser) {

    window.location.replace("index.html");

}


function toLocalDate(date) {

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

}


/* -----------------------------------------
   Tiện ích
----------------------------------------- */

const DAY_NAMES = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật"
];

const DAY_PLACEHOLDERS = [
    "Ngực + Tay sau",
    "Lưng + Tay trước",
    "Chân + Mông",
    "Vai + Cầu vai",
    "Cardio + Core",
    "Toàn thân",
    "Nghỉ chủ động"
];

const PLAN_KEY =
    "gymSchedule";

const DB_NAME =
    "gymMedia";

const PHOTO_STORE =
    "photos";

const MAX_PHOTO_WIDTH =
    1024;

const MAX_SESSION_PHOTOS =
    8;

const TODAY =
    toLocalDate(new Date());

const WEEK_START =
    getWeekStart(new Date());

const WEEK_KEY =
    toLocalDate(WEEK_START);


function getWeekStart(date) {

    const day =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

    const offset =
        (day.getDay() + 6) % 7;

    day.setDate(
        day.getDate() - offset
    );

    return day;

}


function dateOfDay(dayKey) {

    const day =
        new Date(
            WEEK_START.getFullYear(),
            WEEK_START.getMonth(),
            WEEK_START.getDate() + Number(dayKey) - 1
        );

    return toLocalDate(day);

}


function prettyDate(dateString) {

    const parts =
        String(dateString).split("-").map(Number);

    return [
        String(parts[2]).padStart(2, "0"),
        String(parts[1]).padStart(2, "0")
    ].join("/");

}


function escapeHTML(value) {

    return String(value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}


function getInitial(name) {

    return (name || "A").trim().charAt(0).toUpperCase();

}


/* -----------------------------------------
   Kế hoạch của thành viên
----------------------------------------- */

let profile =
    null;


function emptyDay() {

    return {
        muscle: "",
        exercises: "",
        time: "",
        goal: "",
        done: false,
        doneDate: ""
    };

}


function normalizeProfile(stored) {

    const safe =
        stored && typeof stored === "object"
            ? stored
            : {};

    const days = {};

    DAY_NAMES.forEach(
        (name, index) => {

            const key = String(index + 1);

            const source =
                safe.days && safe.days[key]
                    ? safe.days[key]
                    : {};

            const day = emptyDay();

            day.muscle = String(source.muscle || "").slice(0, 40);

            day.exercises = String(source.exercises || "").slice(0, 400);

            day.time = /^\d{2}:\d{2}$/.test(source.time || "")
                ? source.time
                : "";

            day.goal = String(source.goal || "").slice(0, 60);

            day.done =
                source.done === true;

            day.doneDate =
                /^\d{4}-\d{2}-\d{2}$/.test(source.doneDate || "")
                    ? source.doneDate
                    : "";

            days[key] = day;

        }
    );

    const sessions = Array.isArray(safe.sessions)
        ? safe.sessions.filter(
            item =>
                item &&
                item.id &&
                item.dayKey >= 1 &&
                item.dayKey <= 7
        )
        : [];

    return {
        weekStart: safe.weekStart || WEEK_KEY,
        days: days,
        sessions: sessions
    };

}


function loadProfile() {

    const all = readJSON(PLAN_KEY, {});

    profile = normalizeProfile(all[currentUser.code]);

    /* Tuần mới thì bỏ dấu tick, giữ nguyên kế hoạch */

    if (profile.weekStart !== WEEK_KEY) {

        profile.weekStart = WEEK_KEY;

        Object.keys(profile.days).forEach(
            key => {

                profile.days[key].done = false;

                profile.days[key].doneDate = "";

            }
        );

    }

}


let saveTimer = null;


function saveProfile(immediate, quiet) {

    function write() {

        try {

            const all = readJSON(PLAN_KEY, {});

            all[currentUser.code] = profile;

            localStorage.setItem(
                PLAN_KEY,
                JSON.stringify(all)
            );

            if (!quiet) flashSaved();

            renderSummary(true);

        }

        catch (error) {

            showMessage(
                "Không lưu được kế hoạch: bộ nhớ trình duyệt đã đầy.",
                "error"
            );

        }

    }

    if (immediate) {

        if (saveTimer) clearTimeout(saveTimer);

        saveTimer = null;

        write();

        return;

    }

    if (saveTimer) clearTimeout(saveTimer);

    saveTimer = setTimeout(write, 400);

}


let savedTimer = null;


function flashSaved() {

    const note = document.getElementById("autosaveNote");

    if (!note) return;

    note.textContent = "✓ Đã lưu lúc " +
        new Date().toLocaleTimeString(
            "vi-VN",
            { hour: "2-digit", minute: "2-digit" }
        );

    if (savedTimer) clearTimeout(savedTimer);

    savedTimer = setTimeout(
        function () {

            note.textContent = "✓ Tự động lưu";

        },
        2500
    );

}


/* -----------------------------------------
   IndexedDB: lưu ảnh buổi tập
----------------------------------------- */

function openMediaDB() {

    return new Promise(
        function (resolve, reject) {

            if (!window.indexedDB) {

                reject(new Error("Trình duyệt không hỗ trợ IndexedDB"));

                return;

            }

            openMediaAt(null, resolve, reject);

        }
    );

}


/* Bản sao DB có thể đã tồn tại nhưng chưa có table ảnh
   (lần mở trước bị gián đoạn) -> tăng version để tạo lại */

function openMediaAt(version, resolve, reject) {

    const request =
        version === null
            ? indexedDB.open(DB_NAME)
            : indexedDB.open(DB_NAME, version);

    request.onupgradeneeded =
        function () {

            const db = request.result;

            if (!db.objectStoreNames.contains(PHOTO_STORE)) {

                const store =
                    db.createObjectStore(
                        PHOTO_STORE,
                        { keyPath: "id" }
                    );

                store.createIndex(
                    "sessionId",
                    "sessionId",
                    { unique: false }
                );

                store.createIndex(
                    "code",
                    "code",
                    { unique: false }
                );

            }

        };

    request.onsuccess =
        function () {

            const db = request.result;

            if (!db.objectStoreNames.contains(PHOTO_STORE)) {

                const next = db.version + 1;

                db.close();

                openMediaAt(next, resolve, reject);

                return;

            }

            resolve(db);

        };

    request.onerror =
        function () {

            reject(request.error);

        };

    request.onblocked =
        function () {

            reject(new Error("Bộ nhớ ảnh đang bị khóa, hãy tải lại trang"));

        };

}


let mediaDB = null;


function getMediaDB() {

    if (!mediaDB) mediaDB = openMediaDB();

    return mediaDB;

}


function dropMediaDB() {

    if (mediaDB) {

        mediaDB.then(db => db.close()).catch(() => {});

        mediaDB = null;

    }

}


function runStore(mode, worker) {

    return getMediaDB().then(
        function (db) {

            return new Promise(
                function (resolve, reject) {

                    const transaction =
                        db.transaction(PHOTO_STORE, mode);

                    const request =
                        worker(transaction.objectStore(PHOTO_STORE));

                    transaction.oncomplete =
                        function () {

                            resolve(request ? request.result : undefined);

                        };

                    transaction.onerror =
                        function () {

                            dropMediaDB();

                            reject(transaction.error);

                        };

                    transaction.onabort =
                        function () {

                            dropMediaDB();

                            reject(
                                transaction.error ||
                                new Error("Không lưu được ảnh")
                            );

                        };

                }
            );

        }
    ).catch(
        function (error) {

            dropMediaDB();

            throw error;

        }
    );

}


function addPhotos(records) {

    return runStore(
        "readwrite",
        function (store) {

            records.forEach(
                record => store.put(record)
            );

            return null;

        }
    );

}


function getSessionPhotos(sessionId) {

    return runStore(
        "readonly",
        function (store) {

            return store
                .index("sessionId")
                .getAll(sessionId);

        }
    );

}


function getPhotoIds(sessionId) {

    return runStore(
        "readonly",
        function (store) {

            return store
                .index("sessionId")
                .getAllKeys(sessionId);

        }
    );

}


function countMemberPhotos() {

    return runStore(
        "readonly",
        function (store) {

            return store
                .index("code")
                .getAllKeys(currentUser.code);

        }
    ).then(keys => keys.length);

}


function deletePhoto(photoId) {

    return runStore(
        "readwrite",
        function (store) {

            store.delete(photoId);

            return null;

        }
    );

}


function deleteSessionPhotos(sessionId) {

    return getPhotoIds(sessionId).then(
        function (ids) {

            return runStore(
                "readwrite",
                function (store) {

                    ids.forEach(
                        id => store.delete(id)
                    );

                    return null;

                }
            );

        }
    );

}


function deleteAllMemberPhotos() {

    return runStore(
        "readonly",
        function (store) {

            return store
                .index("code")
                .getAllKeys(currentUser.code);

        }
    ).then(
        function (ids) {

            return runStore(
                "readwrite",
                function (store) {

                    ids.forEach(
                        id => store.delete(id)
                    );

                    return null;

                }
            );

        }
    );

}


/* -----------------------------------------
   Hiển thị thông tin thành viên
----------------------------------------- */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) element.textContent = value;

}


function loadUserInfo() {

    if (!currentUser) return;

    const initial = getInitial(currentUser.name);

    setText("sideName", currentUser.name || "Member");

    setText("sideCode", currentUser.code || "GYM001");

    setText("sideAvatar", initial);

    setText("topName", currentUser.name || "Member");

    setText("topCode", currentUser.code || "GYM001");

    setText("topAvatar", initial);

    setText(
        "weekLabel",
        "TUẦN " +
        prettyDate(toLocalDate(WEEK_START)) + " - " +
        prettyDate(toLocalDate(new Date(
            WEEK_START.getFullYear(),
            WEEK_START.getMonth(),
            WEEK_START.getDate() + 6
        )))
    );

}


/* -----------------------------------------
   Vẽ lưới 7 ngày
----------------------------------------- */

function dayCardHTML(dayKey) {

    const day = profile.days[dayKey];

    const date = dateOfDay(dayKey);

    const classes = ["day-card"];

    if (date === TODAY) classes.push("is-today");

    if (day.done) classes.push("is-done");

    const badge = day.done
        ? `<span class="day-badge checked">✓ ${prettyDate(day.doneDate || date)}</span>`
        : date === TODAY
            ? `<span class="day-badge today">HÔM NAY</span>`
            : "";

    const action = day.done
        ? `<button class="link-button"
                    data-action="log"
                    data-day="${dayKey}">
                ➕ Thêm ảnh buổi này
            </button>

            <button class="link-button danger-link"
                    data-action="undo"
                    data-day="${dayKey}">
                ↩ Bỏ tick
            </button>`
        : `<button class="inline-button log-button"
                    data-action="log"
                    data-day="${dayKey}">
                📷 Đã tập
            </button>`;

    const timeLabel = day.time
        ? `🕐 ${escapeHTML(day.time)}`
        : "Chưa đặt giờ";

    return `
        <article class="${classes.join(" ")}"
                 data-day="${dayKey}">

            <div class="day-head">

                <h4>${DAY_NAMES[dayKey - 1]}</h4>

                ${badge}

            </div>

            <div class="field">

                <label>Nhóm cơ</label>

                <input class="text-input"
                       type="text"
                       maxlength="40"
                       data-field="muscle"
                       data-day="${dayKey}"
                       placeholder="${DAY_PLACEHOLDERS[dayKey - 1]}">

            </div>

            <div class="field">

                <label>Bài tập</label>

                <textarea class="text-input"
                          rows="3"
                          maxlength="400"
                          data-field="exercises"
                          data-day="${dayKey}"
                          placeholder="Bench press 4 x 10, dumbbell fly 3 x 12..."></textarea>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Giờ tập</label>

                    <input class="text-input"
                           type="time"
                           data-field="time"
                           data-day="${dayKey}">

                </div>

                <div class="field">

                    <label>Mục tiêu</label>

                    <input class="text-input"
                           type="text"
                           maxlength="60"
                           data-field="goal"
                           data-day="${dayKey}"
                           placeholder="Tăng sức mạnh">

                </div>

            </div>

            <div class="day-foot">

                ${action}

                <small class="day-meta">
                    ${timeLabel} •
                    ${countSessionPhotosLabel(dayKey)}
                </small>

            </div>

        </article>
    `;

}


function countSessionPhotosLabel(dayKey) {

    const sessions =
        profile.sessions.filter(
            item =>
                item.dayKey === Number(dayKey) &&
                item.weekStart === WEEK_KEY
        );

    const total = sessions.reduce(
        (sum, item) => sum + (item.photoCount || 0),
        0
    );

    if (sessions.length === 0) return "chưa tick";

    return total === 0
        ? "đã tập, chưa có ảnh"
        : total + " ảnh đã lưu";

}


function renderWeek() {

    const grid = document.getElementById("weekGrid");

    if (!grid) return;

    grid.innerHTML = DAY_NAMES.map(
        (name, index) => dayCardHTML(index + 1)
    ).join("");

    syncValues();

}


function syncValues() {

    const grid = document.getElementById("weekGrid");

    if (!grid) return;

    grid.querySelectorAll("[data-field]").forEach(
        input => {

            const day =
                profile.days[input.dataset.day];

            input.value =
                day[input.dataset.field] || "";

        }
    );

}


/* -----------------------------------------
   Tóm tắt tuần
----------------------------------------- */

function renderSummary(quiet) {

    const planned =
        DAY_NAMES.filter(
            (name, index) => {

                const day = profile.days[index + 1];

                return day.muscle.trim() !== "" ||
                    day.exercises.trim() !== "";

            }
        ).length;

    const done =
        DAY_NAMES.filter(
            (name, index) => profile.days[index + 1].done
        ).length;

    setText("planCount", String(planned));

    setText("doneCount", done + " / 7");

    setText(
        "sessionCount",
        String(profile.sessions.length)
    );

    const bar =
        document.getElementById("weekProgressBar");

    const text =
        document.getElementById("weekProgressText");

    if (bar) bar.style.width =
        Math.round(done / 7 * 100) + "%";

    if (text) text.textContent =
        done + "/7 buổi hoàn thành" +
        (done === 7 ? " • Xuất sắc! 🔥" : "");

    if (!quiet) refreshPhotoCount();

}


function refreshPhotoCount() {

    countMemberPhotos().then(
        count => setText("photoCount", String(count))
    ).catch(
        () => setText("photoCount", "—")
    );

}


/* -----------------------------------------
   Lời báo
----------------------------------------- */

function showMessage(text, type) {

    const message =
        document.getElementById("scheduleMessage");

    if (!message) return;

    message.textContent = text;

    message.className = "message " + type;

}


function showSessionMessage(text, type) {

    const message =
        document.getElementById("sessionMessage");

    if (!message) return;

    message.textContent = text;

    message.className = "message " + type;

}


/* -----------------------------------------
   Tương tác với lưới ngày
----------------------------------------- */

const weekGrid =
    document.getElementById("weekGrid");


weekGrid.addEventListener(
    "input",
    function (event) {

        const field = event.target.dataset.field;

        const dayKey = event.target.dataset.day;

        if (!field || !dayKey) return;

        profile.days[dayKey][field] =
            event.target.value;

        if (field === "time") updateDayMeta(dayKey);

        saveProfile();

    }
);


function updateDayMeta(dayKey) {

    const meta = weekGrid.querySelector(
        '.day-card[data-day="' + dayKey + '"] .day-meta'
    );

    if (!meta) return;

    const time = profile.days[dayKey].time;

    meta.innerHTML =
        (time ? "🕐 " + escapeHTML(time) : "Chưa đặt giờ") +
        " • " + countSessionPhotosLabel(dayKey);

}


weekGrid.addEventListener(
    "change",
    function (event) {

        const dayKey = event.target.dataset.day;

        if (dayKey) renderSummary();

    }
);


weekGrid.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest("[data-action]");

        if (!button) return;

        const dayKey = button.dataset.day;

        if (button.dataset.action === "log") {

            openSession(dayKey);

            return;

        }

        if (button.dataset.action === "undo") {

            undoDay(dayKey);

        }

    }
);


function findSession(dayKey) {

    return profile.sessions.find(
        item =>
            item.dayKey === Number(dayKey) &&
            item.weekStart === WEEK_KEY
    );

}


function undoDay(dayKey) {

    const session = findSession(dayKey);

    const sure = confirm(
        "Bỏ tick buổi " + DAY_NAMES[dayKey - 1] +
        "?\nẢnh của buổi này sẽ bị xóa khỏi bộ nhớ."
    );

    if (!sure) return;

    profile.days[dayKey].done = false;

    profile.days[dayKey].doneDate = "";

    if (session) {

        profile.sessions =
            profile.sessions.filter(
                item => item.id !== session.id
            );

        deleteSessionPhotos(session.id).catch(
            () => {}
        );

    }

    saveProfile(true);

    renderWeek();

    renderSummary();

    renderGallery();

    showMessage(
        "Đã bỏ tick buổi " + DAY_NAMES[dayKey - 1] + ".",
        "success"
    );

}


/* -----------------------------------------
   Camera + chọn ảnh trong modal
----------------------------------------- */

const modal =
    document.getElementById("sessionModal");

const cameraVideo =
    document.getElementById("sessionCamera");

const cameraCanvas =
    document.getElementById("sessionCanvas");

const startButton =
    document.getElementById("startCamera");

const captureButton =
    document.getElementById("captureButton");

const fileInput =
    document.getElementById("fileInput");

const pendingGrid =
    document.getElementById("pendingGrid");

const noteInput =
    document.getElementById("sessionNote");

const saveButton =
    document.getElementById("saveSession");

const closeButton =
    document.getElementById("closeSession");

let mediaStream = null;

let activeDay = null;

let pendingPhotos = [];

let photoSeq = 1;

let objectURLs = [];


function stopCamera() {

    if (mediaStream) {

        mediaStream.getTracks().forEach(
            track => track.stop()
        );

        mediaStream = null;

    }

    cameraVideo.srcObject = null;

    startButton.disabled = false;

    startButton.textContent = "📷 Bật camera";

    captureButton.disabled = true;

}


function clearObjectURLs() {

    objectURLs.forEach(url => URL.revokeObjectURL(url));

    objectURLs = [];

}


function renderPending() {

    if (pendingPhotos.length === 0) {

        pendingGrid.innerHTML =
            `<small class="pending-empty">
                Chưa có ảnh nào cho buổi này.
            </small>`;

        return;

    }

    pendingGrid.innerHTML =
        pendingPhotos.map(
            photo => `
                <div class="pending-item">

                    <img src="${photo.url}" alt="">

                    <button class="pending-remove"
                            data-remove="${photo.id}">
                        ✕
                    </button>

                </div>
            `
        ).join("");

}


pendingGrid.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest("[data-remove]");

        if (!button) return;

        const id = button.dataset.remove;

        const photo =
            pendingPhotos.find(item => item.id === id);

        if (photo) URL.revokeObjectURL(photo.url);

        pendingPhotos =
            pendingPhotos.filter(item => item.id !== id);

        renderPending();

    }
);


function openSession(dayKey) {

    activeDay = String(dayKey);

    const session = findSession(activeDay);

    pendingPhotos = [];

    showSessionMessage("", "");

    renderPending();

    noteInput.value = "";

    setText(
        "sessionTitle",
        (session ? "Thêm ảnh • " : "Buổi tập • ") +
        DAY_NAMES[activeDay - 1] +
        " (" + prettyDate(dateOfDay(activeDay)) + ")"
    );

    modal.classList.add("open");

}


function closeSession() {

    modal.classList.remove("open");

    stopCamera();

    pendingPhotos.forEach(
        photo => URL.revokeObjectURL(photo.url)
    );

    pendingPhotos = [];

}


closeButton.addEventListener("click", closeSession);


modal.addEventListener(
    "click",
    function (event) {

        if (event.target === modal) closeSession();

    }
);


startButton.addEventListener(
    "click",
    async function () {

        try {

            mediaStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode: "user",
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        },
                        audio: false
                    });

            cameraVideo.muted = true;

            cameraVideo.srcObject = mediaStream;

            cameraVideo.play().catch(() => {});

            startButton.disabled = true;

            startButton.textContent =
                "📷 Camera đang hoạt động";

            captureButton.disabled = false;

            showSessionMessage(
                "Camera đã sẵn sàng, hãy chụp ảnh.",
                "success"
            );

        }

        catch (error) {

            showSessionMessage(
                "Không mở được camera. Hãy cấp quyền camera hoặc dùng nút “Chọn ảnh”.",
                "error"
            );

        }

    }
);


captureButton.addEventListener(
    "click",
    function () {

        if (!mediaStream) return;

        const dataURL =
            drawToDataURL(
                cameraVideo,
                cameraVideo.videoWidth,
                cameraVideo.videoHeight
            );

        if (!dataURL) {

            showSessionMessage(
                "Camera chưa sẵn sàng, chờ vài giây rồi chụp lại.",
                "error"
            );

            return;

        }

        addPendingPhoto(dataURLToBlob(dataURL));

    }
);


function drawToDataURL(source, width, height) {

    if (!width || !height) return null;

    const scale =
        Math.min(1, MAX_PHOTO_WIDTH / width);

    cameraCanvas.width =
        Math.round(width * scale);

    cameraCanvas.height =
        Math.round(height * scale);

    cameraCanvas.getContext("2d").drawImage(
        source,
        0,
        0,
        cameraCanvas.width,
        cameraCanvas.height
    );

    return cameraCanvas.toDataURL(
        "image/jpeg",
        0.8
    );

}


function dataURLToBlob(dataURL) {

    const comma = dataURL.indexOf(",");

    const binary =
        atob(dataURL.slice(comma + 1));

    const bytes =
        new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {

        bytes[i] = binary.charCodeAt(i);

    }

    const mime =
        dataURL.slice(
            dataURL.indexOf(":") + 1,
            dataURL.indexOf(";")
        );

    return new Blob(
        [bytes],
        { type: mime || "image/jpeg" }
    );

}


function addPendingPhoto(blob) {

    if (pendingPhotos.length >= MAX_SESSION_PHOTOS) {

        showSessionMessage(
            "Một buổi chỉ lưu tối đa " +
            MAX_SESSION_PHOTOS + " ảnh.",
            "error"
        );

        return;

    }

    pendingPhotos.push({
        id: "p" + Date.now() + "-" + (photoSeq++),
        blob: blob,
        url: URL.createObjectURL(blob)
    });

    renderPending();

    showSessionMessage(
        "Đã thêm ảnh (" + pendingPhotos.length + ").",
        "success"
    );

}


fileInput.addEventListener(
    "click",
    () => { fileInput.value = ""; }
);


fileInput.addEventListener(
    "change",
    function () {

        const files = Array.from(fileInput.files || [])
            .filter(file => file.type.indexOf("image/") === 0);

        if (files.length === 0) {

            showSessionMessage(
                "Hãy chọn file ảnh.",
                "error"
            );

            return;

        }

        showSessionMessage(
            "Đang xử lý " + files.length + " ảnh...",
            ""
        );

        Promise.all(
            files.map(fileToBlob)
        ).then(
            blobs => {

                blobs.forEach(addPendingPhoto);

            }
        ).catch(
            () => {

                showSessionMessage(
                    "Không đọc được ảnh từ máy.",
                    "error"
                );

            }
        );

    }
);


function fileToBlob(file) {

    return new Promise(
        function (resolve, reject) {

            const reader = new FileReader();

            reader.onerror = () => reject(reader.error);

            reader.onload =
                function () {

                    const image = new Image();

                    image.onerror =
                        () => reject(new Error("Ảnh lỗi"));

                    image.onload =
                        function () {

                            const dataURL =
                                drawToDataURL(
                                    image,
                                    image.naturalWidth,
                                    image.naturalHeight
                                );

                            resolve(
                                dataURLToBlob(dataURL)
                            );

                        };

                    image.src = reader.result;

                };

            reader.readAsDataURL(file);

        }
    );

}


/* -----------------------------------------
   Hoàn thành buổi tập
----------------------------------------- */

saveButton.addEventListener(
    "click",
    function () {

        if (!activeDay || !currentUser) return;

        saveButton.disabled = true;

        commitSession()
            .catch(
                function (error) {

                    showSessionMessage(
                        "Không lưu được buổi tập: " +
                        (error && error.message
                            ? error.message
                            : "lỗi không xác định") +
                        ". Kế hoạch của bạn vẫn còn, hãy thử lại.",
                        "error"
                    );

                }
            )
            .finally(
                function () {

                    saveButton.disabled = false;

                }
            );

    }
);


function commitSession() {

    const dayKey = activeDay;

    const sessionDate = dateOfDay(dayKey);

    const existing = findSession(dayKey);

    const sessionId = existing
        ? existing.id
        : "s" + Date.now();

    const records =
        pendingPhotos.map(
            photo => ({
                id: photo.id,
                code: currentUser.code,
                sessionId: sessionId,
                blob: photo.blob,
                createdAt: new Date().toISOString()
            })
        );

    const save = records.length > 0
        ? addPhotos(records)
        : Promise.resolve();

    return save.then(
        function () {

            if (existing) {

                existing.photoCount =
                    (existing.photoCount || 0) + records.length;

            }

            else {

                profile.sessions.unshift({
                    id: sessionId,
                    dayKey: Number(dayKey),
                    weekStart: WEEK_KEY,
                    date: sessionDate,
                    time: new Date().toLocaleTimeString(
                        "vi-VN",
                        { hour: "2-digit", minute: "2-digit" }
                    ),
                    muscle: profile.days[dayKey].muscle,
                    goal: profile.days[dayKey].goal,
                    note: noteInput.value.trim().slice(0, 140),
                    photoCount: records.length
                });

                profile.days[dayKey].done = true;

                profile.days[dayKey].doneDate = TODAY;

            }

            saveProfile(true);

            closeSession();

            renderWeek();

            renderSummary();

            return renderGallery();

        }
    ).then(
        function () {

            showMessage(
                "🔥 Đã lưu buổi " +
                DAY_NAMES[Number(dayKey) - 1] +
                (records.length > 0
                    ? " cùng " + records.length + " ảnh."
                    : "."),
                "success"
            );

        }
    );

}


/* -----------------------------------------
   Thư viện ảnh các buổi tập
----------------------------------------- */

const gallery =
    document.getElementById("sessionGallery");

const lightbox =
    document.getElementById("lightbox");

const lightboxImage =
    document.getElementById("lightboxImage");


function sessionCardHTML(session) {

    const meta = [
        session.time,
        session.muscle,
        session.goal
    ].filter(Boolean).map(escapeHTML).join(" &nbsp;•&nbsp; ");

    const canAdd = session.weekStart === WEEK_KEY
        ? `<button class="link-button"
                    data-action="add-photos"
                    data-day="${session.dayKey}">
                ➕ Thêm ảnh
            </button>`
        : "";

    return `
        <div class="session-card"
             data-session="${session.id}">

            <div class="session-card-head">

                <div>

                    <strong>
                        ${DAY_NAMES[session.dayKey - 1]}
                        ·
                        ${prettyDate(session.date)}
                    </strong>

                    <small>${meta || "Không có ghi chú"}</small>

                    ${
                        session.note
                        ? `<p class="session-note">
                            “${escapeHTML(session.note)}”
                          </p>`
                        : ""
                    }

                </div>

                <div class="session-card-actions">

                    ${canAdd}

                    <button class="link-button danger-link"
                            data-action="delete-session"
                            data-session="${session.id}">
                        🗑 Xóa buổi
                    </button>

                </div>

            </div>

            <div class="gallery-photos">
                <small class="pending-empty">
                    Đang tải ảnh...
                </small>
            </div>

        </div>
    `;

}


function renderGallery() {

    if (!gallery) return Promise.resolve();

    clearObjectURLs();

    if (profile.sessions.length === 0) {

        gallery.innerHTML = `
            <div class="empty-state">
                Chưa có buổi tập nào được đánh dấu.
                Hãy điền kế hoạch rồi bấm “Đã tập”.
            </div>
        `;

        return Promise.resolve();

    }

    gallery.innerHTML =
        profile.sessions.slice(0, 12)
            .map(sessionCardHTML)
            .join("");

    return Promise.all(
        Array.from(
            gallery.querySelectorAll(".session-card")
        ).map(fillSessionPhotos)
    );

}


function fillSessionPhotos(card) {

    const sessionId = card.dataset.session;

    return getSessionPhotos(sessionId).then(
        function (photos) {

            const box =
                card.querySelector(".gallery-photos");

            if (!box) return;

            const list = photos || [];

            const session =
                profile.sessions.find(
                    item => item.id === sessionId
                );

            if (session && session.photoCount !== list.length) {

                session.photoCount = list.length;

                saveProfile();

                renderWeek();

            }

            if (list.length === 0) {

                box.innerHTML = `
                    <small class="pending-empty">
                        Buổi này chưa có ảnh.
                    </small>
                `;

                return;

            }

            box.innerHTML = "";

            list.forEach(
                function (photo) {

                    const url =
                        URL.createObjectURL(photo.blob);

                    objectURLs.push(url);

                    const figure =
                        document.createElement("figure");

                    figure.className = "gallery-item";

                    const image =
                        document.createElement("img");

                    image.src = url;

                    image.alt = "Ảnh buổi tập";

                    image.loading = "lazy";

                    image.addEventListener(
                        "click",
                        function () {

                            lightboxImage.src = url;

                            lightbox.classList.add("open");

                        }
                    );

                    const remove =
                        document.createElement("button");

                    remove.className = "gallery-remove";

                    remove.textContent = "✕";

                    remove.title = "Xóa ảnh này";

                    remove.dataset.deletePhoto = photo.id;

                    remove.dataset.session = sessionId;

                    figure.appendChild(image);

                    figure.appendChild(remove);

                    box.appendChild(figure);

                }
            );

        }
    ).catch(
        function () {

            const box =
                card.querySelector(".gallery-photos");

            if (box) {

                box.innerHTML = `
                    <small class="pending-empty">
                        Không đọc được ảnh từ bộ nhớ trình duyệt.
                    </small>
                `;

            }

        }
    );

}


gallery.addEventListener(
    "click",
    function (event) {

        const add =
            event.target.closest("[data-action='add-photos']");

        if (add) {

            openSession(add.dataset.day);

            return;

        }

        const remove =
            event.target.closest("[data-delete-photo]");

        if (remove) {

            removeOnePhoto(
                remove.dataset.deletePhoto,
                remove.dataset.session
            );

            return;

        }

        const drop =
            event.target.closest("[data-action='delete-session']");

        if (drop) {

            removeSession(drop.dataset.session);

        }

    }
);


function removeOnePhoto(photoId, sessionId) {

    deletePhoto(photoId).then(
        function () {

            const card =
                gallery.querySelector(
                    '[data-session="' + sessionId + '"]'
                );

            if (!card) return;

            return fillSessionPhotos(card).then(
                function () {

                    renderSummary();

                    renderWeek();

                }
            );

        }
    ).catch(
        function () {

            showMessage(
                "Không xóa được ảnh.",
                "error"
            );

        }
    );

}


function removeSession(sessionId) {

    const session =
        profile.sessions.find(
            item => item.id === sessionId
        );

    if (!session) return;

    const sure = confirm(
        "Xóa buổi " + DAY_NAMES[session.dayKey - 1] +
        " ngày " + prettyDate(session.date) +
        " cùng toàn bộ ảnh của buổi này?"
    );

    if (!sure) return;

    deleteSessionPhotos(sessionId).catch(() => {});

    profile.sessions =
        profile.sessions.filter(
            item => item.id !== sessionId
        );

    if (session.weekStart === WEEK_KEY) {

        profile.days[String(session.dayKey)].done = false;

        profile.days[String(session.dayKey)].doneDate = "";

    }

    saveProfile(true);

    renderWeek();

    renderSummary();

    renderGallery();

    showMessage(
        "Đã xóa buổi tập và ảnh tương ứng.",
        "success"
    );

}


lightbox.addEventListener(
    "click",
    function () {

        lightbox.classList.remove("open");

        lightboxImage.removeAttribute("src");

    }
);


document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") return;

        lightbox.classList.remove("open");

        if (modal.classList.contains("open")) closeSession();

    }
);


/* -----------------------------------------
   Xóa toàn bộ ảnh + lịch sử tập
----------------------------------------- */

const clearSessions =
    document.getElementById("clearSessions");


clearSessions.addEventListener(
    "click",
    function () {

        const sure = confirm(
            "Xóa toàn bộ ảnh và lịch sử buổi tập của bạn?\n" +
            "Kế hoạch tuần (nhóm cơ, bài tập, giờ tập) vẫn được giữ."
        );

        if (!sure) return;

        profile.sessions = [];

        Object.keys(profile.days).forEach(
            key => {

                profile.days[key].done = false;

                profile.days[key].doneDate = "";

            }
        );

        saveProfile(true);

        deleteAllMemberPhotos().then(
            function () {

                showMessage(
                    "Đã dọn lịch sử tập và ảnh.",
                    "success"
                );

            }
        ).catch(
            function () {

                showMessage(
                    "Đã xóa lịch sử, nhưng không xóa được ảnh trong IndexedDB.",
                    "error"
                );

            }
        ).finally(
            function () {

                renderWeek();

                renderSummary();

                renderGallery();

            }
        );

    }
);


/* -----------------------------------------
   Đăng xuất
----------------------------------------- */

document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    function () {

        stopCamera();

        localStorage.removeItem(
            "gymCurrentUser"
        );

        window.location.replace(
            "index.html"
        );

    }
);


window.addEventListener(
    "beforeunload",
    function () {

        saveProfile(true);

    }
);


/* -----------------------------------------
   Init
----------------------------------------- */

loadUserInfo();

loadProfile();

renderWeek();

renderSummary();

renderGallery();
