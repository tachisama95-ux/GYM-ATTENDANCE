/* =========================================
   IRON GYM LOGIN
========================================= */


const loginForm =
    document.getElementById("loginForm");


const loginMessage =
    document.getElementById("loginMessage");


/* -----------------------------------------
   Submit login
----------------------------------------- */

loginForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const name =
            document.getElementById(
                "fullName"
            ).value.trim();


        const code =
            document.getElementById(
                "memberCode"
            ).value.trim().toUpperCase();


        /* Kiểm tra */

        if (name.length < 2) {

            showMessage(
                "Vui lòng nhập họ và tên.",
                "error"
            );

            return;

        }


        if (code.length < 3) {

            showMessage(
                "Mã thành viên không hợp lệ.",
                "error"
            );

            return;

        }


        /* Hiệu ứng */

        const button =
            loginForm.querySelector(
                ".main-button"
            );


        button.disabled = true;

        button.querySelector(
            "span:first-child"
        ).textContent =
            "ĐANG ĐĂNG NHẬP...";


        /* Tạo user */

        const user = {

            name: name,

            code: code,

            loginTime:
                new Date().toISOString()

        };


        localStorage.setItem(
            "gymCurrentUser",
            JSON.stringify(user)
        );


        /* Thành công */

        setTimeout(
            function () {

                showMessage(
                    "Đăng nhập thành công! 🔥",
                    "success"
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "dashboard.html";

                    },
                    500
                );

            },
            700
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

    loginMessage.textContent =
        text;


    loginMessage.className =
        "message " + type;

}