/* =========================================
   IRON GYM CAMERA
========================================= */


/* -----------------------------------------
   User
----------------------------------------- */

const currentUser =
    JSON.parse(
        localStorage.getItem(
            "gymCurrentUser"
        )
    );


if (!currentUser) {

    window.location.href =
        "index.html";

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


/* -----------------------------------------
   User info
----------------------------------------- */

document.getElementById(
    "memberName"
).textContent =
    currentUser.name;


document.getElementById(
    "memberCode"
).textContent =
    currentUser.code;


document.getElementById(
    "sideName"
).textContent =
    currentUser.name;


document.getElementById(
    "sideCode"
).textContent =
    currentUser.code;


document.getElementById(
    "sideAvatar"
).textContent =
    currentUser.name
        .charAt(0)
        .toUpperCase();


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
   Check today's attendance
----------------------------------------- */

function alreadyCheckedIn() {

    const data =
        JSON.parse(
            localStorage.getItem(
                "gymAttendance"
            ) || "[]"
        );


    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    return data.some(
        item =>
            item.date === today
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


            video.srcObject =
                stream;


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


        const width =
            video.videoWidth;


        const height =
            video.videoHeight;


        canvas.width =
            width;


        canvas.height =
            height;


        const context =
            canvas.getContext(
                "2d"
            );


        context.drawImage(
            video,
            0,
            0,
            width,
            height
        );


        photoData =
            canvas.toDataURL(
                "image/jpeg",
                0.75
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
   Check in
----------------------------------------- */

checkinButton.addEventListener(
    "click",
    function () {

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


                const attendance =
                    JSON.parse(
                        localStorage.getItem(
                            "gymAttendance"
                        ) || "[]"
                    );


                const record = {

                    id:
                        Date.now(),

                    name:
                        currentUser.name,

                    code:
                        currentUser.code,

                    date:
                        now.toISOString()
                            .split("T")[0],

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


                attendance.unshift(
                    record
                );


                localStorage.setItem(
                    "gymAttendance",
                    JSON.stringify(
                        attendance
                    )
                );


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


        window.location.href =
            "index.html";

    }
);