/* =========================================
   IRON GYM APP
========================================= */


/* -----------------------------------------
   Kiểm tra đăng nhập
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


/* -----------------------------------------
   Lấy lịch sử điểm danh (theo thành viên)
----------------------------------------- */

function getAttendance() {

    const all = readJSON("gymAttendance", []);

    if (!currentUser) return all;

    return all.filter(
        item => item.code === currentUser.code
    );

}


/* -----------------------------------------
   Ngày theo giờ địa phương
----------------------------------------- */

function toLocalDate(date) {

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

}


function getToday() {

    return toLocalDate(new Date());

}


function countThisMonth(attendance) {

    const prefix = getToday().slice(0, 7);

    return attendance.filter(
        item => (item.date || "").slice(0, 7) === prefix
    ).length;

}


/* -----------------------------------------
   Lấy chữ cái đầu
----------------------------------------- */

function getInitial(name) {

    if (!name) return "A";

    return name
        .trim()
        .charAt(0)
        .toUpperCase();

}


/* -----------------------------------------
   Hiển thị thông tin member
----------------------------------------- */

function loadUserInfo() {

    if (!currentUser) return;


    const name =
        currentUser.name || "Member";


    const code =
        currentUser.code || "GYM001";


    const elements = {

        sideName:
            document.getElementById("sideName"),

        sideCode:
            document.getElementById("sideCode"),

        topName:
            document.getElementById("topName"),

        topCode:
            document.getElementById("topCode"),

        topAvatar:
            document.getElementById("topAvatar"),

        sideAvatar:
            document.getElementById("sideAvatar"),

        welcomeName:
            document.getElementById("welcomeName"),

        memberName:
            document.getElementById("memberName"),

        memberCode:
            document.getElementById("memberCode")

    };


    if (elements.sideName)
        elements.sideName.textContent = name;


    if (elements.sideCode)
        elements.sideCode.textContent = code;


    if (elements.topName)
        elements.topName.textContent = name;


    if (elements.topCode)
        elements.topCode.textContent = code;


    if (elements.topAvatar)
        elements.topAvatar.textContent =
            getInitial(name);


    if (elements.sideAvatar)
        elements.sideAvatar.textContent =
            getInitial(name);


    if (elements.welcomeName)
        elements.welcomeName.textContent = name;


    if (elements.memberName)
        elements.memberName.textContent = name;


    if (elements.memberCode)
        elements.memberCode.textContent = code;

}


/* -----------------------------------------
   Nhãn ngày trên topbar
----------------------------------------- */

function loadTodayLabel() {

    const label =
        document.getElementById("topDate");

    if (!label) return;

    label.textContent =
        new Date().toLocaleDateString(
            "vi-VN",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).toUpperCase();

}


/* -----------------------------------------
   Đăng xuất
----------------------------------------- */

const logoutButton =
    document.getElementById("logoutButton");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "gymCurrentUser"
            );

            window.location.replace(
                "index.html"
            );

        }
    );

}


/* -----------------------------------------
   Dashboard statistics
----------------------------------------- */

function loadDashboard() {

    const attendance =
        getAttendance();


    const total =
        document.getElementById(
            "totalAttendance"
        );


    const month =
        document.getElementById(
            "monthAttendance"
        );


    if (total) {

        total.textContent =
            attendance.length;

    }


    if (month) {

        month.textContent =
            countThisMonth(attendance);

    }


    calculateStreak();

    loadTodayStatus();

    loadRecent();

}


/* -----------------------------------------
   Tính streak
----------------------------------------- */

function calculateStreak() {

    const streakElement =
        document.getElementById("streak");


    if (!streakElement) return;


    const attendance =
        getAttendance();


    if (attendance.length === 0) {

        streakElement.textContent = "0";

        return;

    }


    const dates =
        attendance
            .map(item => item.date)
            .filter(
                (value, index, self) =>
                    self.indexOf(value) === index
            )
            .sort()
            .reverse();


    let streak = 0;

    let checkDate = new Date();


    while (true) {

        const date =
            toLocalDate(checkDate);


        if (dates.includes(date)) {

            streak++;

            checkDate.setDate(
                checkDate.getDate() - 1
            );

        } else {

            break;

        }

    }


    streakElement.textContent =
        streak;

}


/* -----------------------------------------
   Trạng thái hôm nay
----------------------------------------- */

function loadTodayStatus() {

    const attendance =
        getAttendance();


    const today =
        getToday();


    const todayRecord =
        attendance.find(
            item =>
                item.date === today
        );


    const badge =
        document.getElementById(
            "todayStatusBadge"
        );


    const content =
        document.getElementById(
            "todayContent"
        );


    if (!badge || !content)
        return;


    if (todayRecord) {

        badge.textContent =
            "✓ ĐÃ ĐIỂM DANH";


        badge.classList.add(
            "checked"
        );


        content.innerHTML = `

            <div class="empty-icon">
                ✅
            </div>

            <h4>
                Bạn đã điểm danh hôm nay
            </h4>

            <p>
                Thời gian:
                <strong>
                    ${todayRecord.time}
                </strong>
            </p>

            <a
                href="history.html"
                class="secondary-button"
                style="display:inline-block;margin-top:17px"
            >
                📅 Xem lịch sử
            </a>

        `;

    }

}


/* -----------------------------------------
   Hoạt động gần đây
----------------------------------------- */

function loadRecent() {

    const container =
        document.getElementById(
            "recentList"
        );


    if (!container) return;


    const attendance =
        getAttendance();


    if (attendance.length === 0) {

        container.innerHTML = `

            <div class="empty-state">
                Chưa có lịch sử điểm danh.
            </div>

        `;

        return;

    }


    const recent =
        attendance.slice(0, 5);


    container.innerHTML =
        recent.map(item => `

            <div class="recent-item">

                <div class="recent-icon">
                    ✓
                </div>

                <div>

                    <strong>
                        Điểm danh thành công
                    </strong>

                    <small>
                        ${formatDate(item.date)}
                        •
                        ${item.time}
                    </small>

                </div>

            </div>

        `).join("");

}


/* -----------------------------------------
   Format ngày
----------------------------------------- */

function formatDate(dateString) {

    const parts =
        String(dateString).split("-").map(Number);


    const date =
        new Date(parts[0], parts[1] - 1, parts[2]);


    return date.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


/* -----------------------------------------
   History
----------------------------------------- */

function loadHistory() {

    const list =
        document.getElementById(
            "historyList"
        );


    if (!list) return;


    const attendance =
        getAttendance();


    const total =
        document.getElementById(
            "historyTotal"
        );


    const month =
        document.getElementById(
            "historyMonth"
        );


    const last =
        document.getElementById(
            "lastAttendance"
        );


    if (total)
        total.textContent =
            attendance.length;


    if (month)
        month.textContent =
            countThisMonth(attendance);


    if (last && attendance.length > 0) {

        last.textContent =
            formatDate(
                attendance[0].date
            );

    }


    if (attendance.length === 0) {

        list.innerHTML = `

            <div class="history-empty">

                <div>📅</div>

                <p>
                    Bạn chưa có buổi tập nào.
                </p>

            </div>

        `;

        return;

    }


    list.innerHTML =
        attendance.map(item => `

            <div class="history-item">

                ${
                    item.image
                    ?
                    `<img
                        src="${item.image}"
                        class="history-image"
                    >`
                    :
                    `<div class="history-image"
                          style="
                          display:flex;
                          align-items:center;
                          justify-content:center;
                          font-size:20px;">
                        🏋️
                    </div>`
                }


                <div class="history-info">

                    <strong>
                        Buổi tập tại IRON GYM
                    </strong>

                    <small>

                        ${formatDate(item.date)}

                        &nbsp; • &nbsp;

                        ${item.time}

                    </small>

                </div>


                <div class="history-check">

                    ✓ VERIFIED

                </div>

            </div>

        `).join("");

}


/* -----------------------------------------
   Xóa lịch sử
----------------------------------------- */

const clearHistory =
    document.getElementById(
        "clearHistory"
    );


if (clearHistory) {

    clearHistory.addEventListener(
        "click",
        function () {

            if (!currentUser) return;


            const confirmDelete =
                confirm(
                    "Bạn có chắc muốn xóa toàn bộ lịch sử điểm danh của mình?"
                );


            if (!confirmDelete)
                return;


            const others =
                readJSON("gymAttendance", []).filter(
                    item => item.code !== currentUser.code
                );


            localStorage.setItem(
                "gymAttendance",
                JSON.stringify(others)
            );


            loadHistory();

        }
    );

}


/* -----------------------------------------
   Init
----------------------------------------- */

loadUserInfo();

loadTodayLabel();

loadDashboard();

loadHistory();