/* =========================================
   IRON GYM CAMERA
========================================= */


/* -----------------------------------------
   User
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
   Ngày theo giờ địa phương
----------------------------------------- */

function toLocalDate(date) {

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

}


/* -----------------------------------------
   Elements
----------------------------------------- */

const video =
    document.getElementById(
        "camera"
    );


const canvas =
    document.getElementById(
        "canvas"
    );


const preview =
    document.getElementById(
        "photoPreview"
    );


const startButton =
    document.getElementById(
        "startCamera"
    );


const captureButton =
    document.getElementById(
        "captureButton"
    );


const retakeButton =
    document.getElementById(
        "retakeButton"
    );


const checkinButton =
    document.getElementById(
        "checkinButton"
    );


const message =
    document.getElementById(
        "attendanceMessage"
    );


let stream = null;

let photoData = null;


/* Ảnh nhỏ vừa đủ để xem lại, tránh đầy localStorage */

const MAX_PHOTO_WIDTH =
    640;


/* -----------------------------------------
   User info
----------------------------------------- */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element)
        element.textContent = value;

}


if (currentUser) {

    const initial =
        (currentUser.name || "A")
            .trim()
            .charAt(0)
            .toUpperCase();

    setText("memberName", currentUser.name);

    setText("memberCode", currentUser.code);

    setText("sideName", currentUser.name);

    setText("sideCode", currentUser.code);

    setText("sideAvatar", initial);

}


/* -----------------------------------------
   Date / Time
----------------------------------------- */

function updateDateTime() {

    const now =
        new Date();


    document.getElementById(
        "currentDate"
    ).textContent =
        now.toLocaleDateString(
            "vi-VN",
            {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );


    document.getElementById(
        "currentTime"
    ).textContent =
        now.toLocaleTimeString(
            "vi-VN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


updateDateTime();


setInterval(
    updateDateTime,
    1000
);


/* -----------------------------------------
   Cảnh báo nếu hôm nay đã điểm danh
----------------------------------------- */

if (alreadyCheckedIn()) {

    showMessage(
        "Bạn đã điểm danh hôm nay. Hẹn bạn ở buổi tập tới! 💪",
        "success"
    );

}


/* -----------------------------------------
   Check today's attendance
----------------------------------------- */

function alreadyCheckedIn() {

    if (!currentUser) return false;

    const data =
        readJSON("gymAttendance", []);

    const today =
        toLocalDate(new Date());

    return data.some(
        item =>
            item.date === today &&
            item.code === currentUser.code
    );

}


/* -----------------------------------------
   Start camera
----------------------------------------- */

startButton.addEventListener(
    "click",
    async function () {

        try {

            stream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video: {

                            facingMode:
                                "user",

                            width: {
                                ideal: 1280
                            },

                            height: {
                                ideal: 720
                            }

                        },

                        audio: false

                    });


            video.muted =
                true;


            video.srcObject =
                stream;


            video
                .play()
                .catch(() => {});


            captureButton.disabled =
                false;


            startButton.textContent =
                "📷 Camera đang hoạt động";


            startButton.disabled =
                true;


            showMessage(
                "Camera đã sẵn sàng. Hãy chụp ảnh.",
                "success"
            );

        }

        catch (error) {

            console.error(error);


            showMessage(
                "Không thể mở camera. Hãy cấp quyền camera cho trình duyệt.",
                "error"
            );

        }

    }
);


/* -----------------------------------------
   Capture
----------------------------------------- */

captureButton.addEventListener(
    "click",
    function () {

        if (!stream)
            return;


        const sourceWidth =
            video.videoWidth;


        const sourceHeight =
            video.videoHeight;


        if (!sourceWidth || !sourceHeight) {

            showMessage(
                "Camera chưa sẵn sàng, hãy chờ vài giây rồi chụp lại.",
                "error"
            );

            return;

        }


        const scale =
            Math.min(
                1,
                MAX_PHOTO_WIDTH / sourceWidth
            );


        canvas.width =
            Math.round(sourceWidth * scale);


        canvas.height =
            Math.round(sourceHeight * scale);


        const context =
            canvas.getContext(
                "2d"
            );


        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );


        photoData =
            canvas.toDataURL(
                "image/jpeg",
                0.7
            );


        preview.src =
            photoData;


        preview.style.display =
            "block";


        video.style.display =
            "none";


        captureButton.disabled =
            true;


        retakeButton.disabled =
            false;


        checkinButton.disabled =
            false;


        showMessage(
            "Ảnh đã được chụp. Hãy xác nhận điểm danh.",
            "success"
        );

    }
);


/* -----------------------------------------
   Retake
----------------------------------------- */

retakeButton.addEventListener(
    "click",
    function () {

        photoData = null;


        preview.style.display =
            "none";


        video.style.display =
            "block";


        captureButton.disabled =
            false;


        retakeButton.disabled =
            true;


        checkinButton.disabled =
            true;


        showMessage(
            "",
            ""
        );

    }
);


/* -----------------------------------------
   Lưu buổi tập
----------------------------------------- */

function saveRecord(record) {

    const attendance =
        readJSON("gymAttendance", []);

    attendance.unshift(record);

    try {

        localStorage.setItem(
            "gymAttendance",
            JSON.stringify(attendance)
        );

        return true;

    }

    catch (error) {

        /* Bộ nhớ đầy: vẫn giữ được buổi tập, bỏ ảnh */

        attendance[0].image = "";

        try {

            localStorage.setItem(
                "gymAttendance",
                JSON.stringify(attendance)
            );

            return true;

        }

        catch (retryError) {

            return false;

        }

    }

}


/* -----------------------------------------
   Check in
----------------------------------------- */

checkinButton.addEventListener(
    "click",
    function () {

        if (!currentUser)
            return;


        if (!photoData) {

            showMessage(
                "Bạn chưa chụp ảnh.",
                "error"
            );

            return;

        }


        if (alreadyCheckedIn()) {

            showMessage(
                "Bạn đã điểm danh hôm nay rồi! ✅",
                "error"
            );

            return;

        }


        checkinButton.disabled =
            true;


        checkinButton.querySelector(
            "span:first-child"
        ).textContent =
            "ĐANG XÁC NHẬN...";


        setTimeout(
            function () {

                const now =
                    new Date();


                const record = {

                    id:
                        Date.now(),

                    name:
                        currentUser.name,

                    code:
                        currentUser.code,

                    date:
                        toLocalDate(now),

                    time:
                        now.toLocaleTimeString(
                            "vi-VN",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            }
                        ),

                    timestamp:
                        now.toISOString(),

                    image:
                        photoData

                };


                if (!saveRecord(record)) {

                    checkinButton.disabled =
                        false;

                    checkinButton.querySelector(
                        "span:first-child"
                    ).textContent =
                        "✅ XÁC NHẬN ĐIỂM DANH";

                    showMessage(
                        "Không thể lưu buổi tập: bộ nhớ trình duyệt đã đầy. Hãy xóa lịch sử cũ rồi thử lại.",
                        "error"
                    );

                    return;

                }


                checkinButton.querySelector(
                    "span:first-child"
                ).textContent =
                    "✓ ĐIỂM DANH THÀNH CÔNG";


                showMessage(
                    "🔥 Điểm danh thành công! Chúc bạn có một buổi tập thật tốt.",
                    "success"
                );


                /* Dừng camera */

                if (stream) {

                    stream
                        .getTracks()
                        .forEach(
                            track =>
                                track.stop()
                        );

                }


                setTimeout(
                    function () {

                        window.location.href =
                            "dashboard.html";

                    },
                    1200
                );


            },
            900
        );

    }
);


/* -----------------------------------------
   Message
----------------------------------------- */

function showMessage(
    text,
    type
) {

    message.textContent =
        text;


    message.className =
        "message " + type;

}


/* -----------------------------------------
   Logout
----------------------------------------- */

document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    function () {

        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        localStorage.removeItem(
            "gymCurrentUser"
        );


        window.location.replace(
            "index.html"
        );

    }
);