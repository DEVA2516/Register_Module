
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
    })
    .then(res => {
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

    // var count = 0;
    // var token = '';
    
 fetch("http://localhost:3001/loginData",{
        method : 'POST',
        headers : { 'Content-Type' : 'application/json'},
        body : JSON.stringify(jsObject)
    })  
    .then(res => {
        console.log(res);
        res.json().then(data => {
            console.log(data);
            data = data.obj;

            if(data.verify && data.passMatch && data.uemail){ // false / false / false
               // console.log(data.token);
                console.log("logged in successfuly....")
                
                localStorage.setItem('token',data.token);

                window.location.href = 'http://localhost:5500/form_index.html';
            }

            else if (data.passMatch && data.uemail)
               // console.log("please verify your password...");
               document.getElementById("demo").innerText = "Please verify your email";
            
            else 
                //console.log("Your email or password incorrect...")
                document.getElementById("demo").innerText = "Your email or password is incorrect"
        })
     }) ;  
}