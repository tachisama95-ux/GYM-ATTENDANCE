/* =========================================
   IRON GYM APP
========================================= */


/* -----------------------------------------
   Kiểm tra đăng nhập
----------------------------------------- */

const currentUser =
    JSON.parse(localStorage.getItem("gymCurrentUser"));


if (!currentUser) {

    window.location.href = "index.html";

}


/* -----------------------------------------
   Lấy lịch sử điểm danh
----------------------------------------- */

function getAttendance() {

    return JSON.parse(
        localStorage.getItem("gymAttendance") || "[]"
    );

}


/* -----------------------------------------
   Lưu lịch sử
----------------------------------------- */

function saveAttendance(data) {

    localStorage.setItem(
        "gymAttendance",
        JSON.stringify(data)
    );

}


/* -----------------------------------------
   Ngày hiện tại
----------------------------------------- */

function getToday() {

    const date = new Date();

    return date.toISOString().split("T")[0];

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

            window.location.href =
                "index.html";

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


    const currentMonth =
        new Date().getMonth();


    const currentYear =
        new Date().getFullYear();


    const monthData =
        attendance.filter(item => {

            const date =
                new Date(item.timestamp);

            return (
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
            );

        });


    if (month) {

        month.textContent =
            monthData.length;

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
            checkDate.toISOString()
                .split("T")[0];


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

    const date =
        new Date(dateString);


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


    const currentMonth =
        new Date().getMonth();


    const currentYear =
        new Date().getFullYear();


    const monthCount =
        attendance.filter(item => {

            const date =
                new Date(item.timestamp);

            return (
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
            );

        }).length;


    if (month)
        month.textContent =
            monthCount;


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

            const confirmDelete =
                confirm(
                    "Bạn có chắc muốn xóa toàn bộ lịch sử?"
                );


            if (!confirmDelete)
                return;


            localStorage.removeItem(
                "gymAttendance"
            );


            loadHistory();

        }
    );

}


/* -----------------------------------------
   Init
----------------------------------------- */

loadUserInfo();

loadDashboard();

loadHistory();