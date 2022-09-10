
function signup() {

    let uname = document.getElementById("uname").value;
    let upass = document.getElementById("upass").value;

    let jsObject = {
        'name': uname,
        'pass': upass
    }


    console.log("Frontend js obj = ", jsObject);

    fetch('http://localhost:3001/signUpData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsObject)
    })
        .then(res => {
            res.text().then(data => {
                document.getElementById("demo").innerText = data;
            })
        });

}

function login() {

    let uname = document.getElementById("uname").value;
    let upass = document.getElementById("upass").value;

    let jsObject = {
        'name': uname,
        'pass': upass
    }

    fetch("http://localhost:3001/loginData", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsObject)
    })
        .then(res => {
            res.json().then(data => {

                data = data.obj;

                if (data.flag) {

                    localStorage.setItem('token', data.token);
                    console.log("logged in successfuly....", data.token);
                    window.location.href = 'http://localhost:5500/form_index.html';
                }

                else
                    document.getElementById("demo").innerText = data.message
            })
        });
}