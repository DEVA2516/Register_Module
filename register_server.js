var express = require("express");
var cors = require('cors');
var mysql = require("mysql");
var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var { expressjwt: jwtVerify } = require("express-jwt");
var rateLimit = require('express-rate-limit');
const { RateLimiterMemory } = require('rate-limiter-flexible');
var moment = require("moment");
var nodemailer = require("nodemailer");
const { rmSync } = require("fs");
require("dotenv").config();


var app = express();
app.use(cors());
app.use(express.json())
// app.use(jwt.verify())


app.use(
    jwtVerify({
        secret: "iiissss",
        algorithms: ["HS256"],
    }).unless({ path: ["/signUpData", "/loginData", "/verify", "/validateEmail", "/valTokenPass"] })
);

var jwt_key = "iiissss";


app.listen(3001, () => {
    console.log("Register server running....")
});


// ----------------------------- MYSQL connection --------------------------

var con = mysql.createConnection({
    'host': process.env.HOST,
    'user': process.env.MY_USER,
    'password': process.env.PASSWORD,
    'database': process.env.DATABASE
});

con.connect(err => {
    if (err) {
        console.error('error connecting ' + err.stack);
        return
    }
    console.log("connected as id" + con.threadId);
})


// ----------------------------------SEND MAIL Operation------------------------------------------------------

function sendmail(htmlLink, email) {

    console.log(htmlLink);

    return new Promise((resolve, reject) => {

        var transporter = nodemailer.createTransport({
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: "594b747d5faf6b",
                pass: "156e561cccbc78"
            }
        });

        message = {

            from: "from-example@email.com",
            to: email,
            subject: "Verify email",
            html: htmlLink
        }

        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log(err);
                reject(false);
            } else {
                console.log(info);
                resolve(true);
            }
        })
    })

}


//------------------------------------SIGN UP Operation-----------------------------------------------------------

app.post("/signUpData", (req, res) => {

    let { name, pass } = req.body;

    let sqlem = 'select * from user where email = ? '

    con.query(sqlem, [name], (err, result) => {

        if (err) {
            console.error(err.stack);
            res.send("Something Went Wrong");
            return;
        }

        else if (result.length == 0) {

            let token = jwt.sign({ 'email': name + parseInt(Math.random() * 10) }, jwt_key);

            let sql = 'INSERT INTO user (email,password,token) values (?,?,?)';

            bcrypt.hash(pass, 10, (err, hash) => {

                if (err) {
                    console.error("Error:" + err.stack);
                    res.send("something went wrong");
                    return;
                }

                console.log(hash);

                con.query(sql, [name, hash, token], async (err, values) => {

                    if (err) {
                        console.error("Insert" + err.stack);
                        res.send("something went wrong");
                        return;
                    }

                    let htmlLink = '<html><body><br><br><p>please verify your mail <a href="http://localhost:5500/token.html?token='
                        + token + '" > click </a> </p> </body> </html>'

                    let mailInfo = await sendmail(htmlLink, name);

                    if (mailInfo) {
                        console.log("sign upsss...")
                        res.send("Signed Up Successfully .........................");
                        return;
                    }
                    else {
                        res.send('something went wrong...');
                        return;
                    }
                })
            })
        }

        else {
            if (result[0].is_verified == 0) {

                res.send("Please verify your mail");
                return
            }
            res.send("Email is already Registered.............");
        }
    })
});

var count = 0;
//-----------------------------------LOGIN Operation---------------------------------------------


app.post("/loginData", (req, res) => {

    let { name, pass } = req.body;
    let sql = "select * from user where email = ? ";
    let obj = {
        'flag': false,
        'message': 'Something went wrong'
    }

    con.query(sql, [name], (err, result) => {
        console.log(result);

        if (err) {
            console.error("Error" + err.stack);
            res.json({ obj })
            return;
        }

        else if (result.length == 0) {
            res.json({ obj });
        }

        else {

            if (result[0].login_fail_count == 5) {

                let sqlBlockTimeUp = "UPDATE user SET block = 1, timestamp = unix_timestamp(now()) where id  = ?";
                updateData(sqlBlockTimeUp);
            }

            bcrypt.compare(pass, result[0].password, (err, ismatch) => {

                if (err) {
                    console.error("Error " + err.stack);
                    res.json({ obj });
                    return;
                }

                else if (ismatch) {
                    
                    if (result[0].block != 0) {
                        let currentTime = parseInt((new Date().getTime() / 1000).toFixed(0));
                        let refreshTime = 60;

                        console.log("CR Time = ", currentTime - result[0].timestamp, "Sec = ", refreshTime)

                        if (currentTime - result[0].timestamp > refreshTime) {
                            sqlBlockCountUp = "UPDATE user SET login_fail_count = 0, block = 0 where id = ?"
                            updateData(sqlBlockCountUp);
                        }
                    }


                    if (result[0].is_verified == 1 && result[0].block == 0) {

                        var token_auth = jwt.sign(
                            {
                                'id': result[0].id,
                                'email': result[0].email
                            }, jwt_key)

                        obj = {
                            'flag': true,
                            'token': token_auth
                        }
                        res.json({ obj });// login successfully
                        return;
                    }
                    console.log("Too many login fail counts");
                    obj.message = "please verify your email"
                    res.json({ obj });//please verify your email  // true false
                    return;
                }

                else {

                    let sqlUp = "UPDATE user SET login_fail_count = ? where id = ?"

                    con.query(sqlUp, [result[0].login_fail_count + 1, result[0].id], (err, upResult) => {

                        if (err) {
                            console.error("error" + err.stack);
                            res.json({ obj });
                            return
                        }

                        console.log(upResult);

                    })


                    res.json({ obj });
                    return // password does not match
                }
            })

        }

        function updateData(sqlBlockUp) {

            con.query(sqlBlockUp, [result[0].id], (err, blockUpResult) => {

                if (err) {
                    console.log(err.stack);
                    res.json({ obj });
                    return;
                }
                console.log(blockUpResult);
            })
        }
    })
})



// --------------------Verify TOKEN ---------------------------------------------------------- 

app.post("/verify", (req, res) => {

    console.log('token verification.........');

    let sql = 'select id from user where is_verified = 0 && token = ?';

    con.query(sql, [req.body.token], (err, data) => {

        console.log(data);

        if (err) {
            console.error("Error:" + err.stack);
            return;
        }
        //console.log(data);
        else if (data.length == 0) {
            console.log("...........id not matched");
            res.send(false);
            return;
        }

        else {

            console.log("Updating token.......................");
            let sqlup = 'UPDATE user SET is_verified = 1,token = null where id = ?'

            con.query(sqlup, [data[0].id], (err, result) => {
                console.log(result);

                if (err) {
                    console.error("error" + err.stack);
                    return;
                }
                res.send(true);
                return;
            })
            console.log("token verified finished")
        }
    })

})


//---------------------------- FORM_INSERT Operation-----------------------------------

app.post("/insert", (req, res) => {

    data = req.body;

    let sql = 'INSERT INTO user_message(name,email,message) values (?,?,?)';

    con.query(sql, [data.name, data.email, data.message], (err, result) => {

        if (err) {
            console.error(err.stack);
            res.send("something went wrong")
            return;
        }
        res.send("submited successfully.....");
    })

})

//------------------------LIST VIEW DETAILS -------------------------------------------------

app.get("/view", (req, res) => {

    sql = 'select * from user_message where is_deleted != 1';

    con.query(sql, (err, data) => {


        if (err) {
            console.log(err.stack);
            res.send("something went wrong");
            return
        }

        res.json({ data });
    });
});


//------------------------------get EDIT details -----------------------------------------------------------------

app.get("/getbyid", (req, res) => {
    //console.log(req.query);

    let sql = 'select * from user_message where id =' + req.query.id;

    con.query(sql, (err, data) => {

        if (err) {
            console.log(err);
            res.send("something went wrong");
            return;
        }

        res.json({ data });
        //console.log(data);
    });
});

// -------------------------------update operation UPDATE ----------------------------------------------------

app.put("/updatebyid", (req, res) => {

    console.log(req.query);
    let data = req.body;

    let sql = "UPDATE user_message SET name = ?, email = ?, message = ? where id = ?";

    con.query(sql, [data.name, data.email, data.message, data.id], (err, result) => {

        if (err)
            console.log(err);

        res.json({ result });
    }
    );
});


// -----------------------------DELETE Operation ------------------------------------------

app.delete("/deleteUserMsg", (req, res) => {
    data = req.body;
    let sql = "UPDATE user_message SET is_deleted = 1 where id = ?";

    con.query(sql, [data.id], (err, result) => {
        console.log(result);

        if (err) {
            res.send(false);
        }

        else if (result.length == 0)
            res.send(false);

        else
            res.send(true);
    })
})


//-----------------------------Validate Email ------------------------------------------------------

app.post("/validateEmail", (req, res) => {

    let sql = "select * from user where email = ?";

    con.query(sql, [req.body.email], (err, val) => {

        //console.log(val); 
        //apitoken = 

        if (err) {
            console.error(err.stack);
            res.send("Something Went Wrong....");
            return
        }

        else if (val.length == 0) {
            console.log("Email not matched.......")
            res.send("Something Went Wrong.......");
            return
        }

        else {

            let generate_token = jwt.sign({ 'e': val[0].email }, jwt_key);
            let sqlin = "INSERT INTO user_forget_pass (email,token) values (?,?)";

            con.query(sqlin, [val[0].email, generate_token], async (err, result) => {

                if (err) {
                    console.error(err.stack);
                    res.send("Something Went Wrong");
                    return;
                }

                let htmlLink = '<html><body><br><br><p>please forget your  password using this link <a href="http://localhost:5500/pass.html?token='
                    + generate_token + '" > click </a> </p> </body> </html>'
                // console.log(result);
                let mailInfo = await sendmail(htmlLink, val[0].email);

                if (mailInfo) {
                    res.send("Check your mail");
                    return
                }
                res.send("Something went wrong")
            })


        }
    })
})



//--------------------------------------VALIDATE TOKEN FORGET PASS-------------------------------------------------

app.post("/valTokenPass", (req, res) => {

    let obj = req.body;

    let decode_token = jwt.verify(obj.getToken, jwt_key);
    console.log(decode_token);

    let return_obj = {
        'flag': false,
        'message': 'something went wrong'
    };

    let sql = "select email from user_forget_pass where id =" +
        " (select max(id) from user_forget_pass where email = ?) && token = ?";

    con.query(sql, [decode_token.e, obj.getToken], (err, result) => {

        console.log(result);

        if (err) {
            console.error(err.stack);
            res.json({ return_obj });
            return;
        }

        else if (result.length == 0) {
            console.log("token not matched.....");
            res.json({ return_obj });
            return;
        }

        else {

            let sqlUp = 'UPDATE user SET password = ? WHERE email = ?';

            bcrypt.hash(obj.newpass, 10, (err, hashedpass) => {

                if (err) {
                    console.error(err.stack);
                    res.json({ return_obj });
                    return;
                }

                con.query(sqlUp, [hashedpass, result[0].email], (err, info) => {

                    if (err) {
                        console.error(err.stack);
                        res.json({ return_obj });
                        return;
                    }

                    return_obj = {
                        'flag': true,
                        'message': "Password changed successfully"
                    };
                    res.json({ return_obj });
                })
            })
        }
    })
})

app.get("/logout", (req, res) => {

    req.auth = null;
    console.log(res);
    res['_header']['access-control-allow-origin'] = null
})