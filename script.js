
function signup() {
let uname = document.getElementById("uname").value;
let upass = document.getElementById("upass").value;
let jsObject = {
    'name': uname,
    'pass': upass
}
    fetch('http://localhost:3001/signUpData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsObject)
    }).then(res => {
        res.text().then(data => {
            //console.log(data);
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
    fetch("http://localhost:3001/loginData",{
        method : 'POST',
        headers : { 'Content-Type' : 'application/json'},
        body : JSON.stringify(jsObject)
    })  
    .then(res => {
        res.text().then(data => data)
     }) ;   
    
 }