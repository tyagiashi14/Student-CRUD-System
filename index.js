const express = require('express');
const bodyparser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');


const app = express();


app.use(cors());
app.use(bodyparser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//databse connection
const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'user',
    port:3306
})
//check connection
db.connect(err=>{
    if(err) {console.log(err,"error in connection")}
    console.log("database connected");
});

// Multer configuration
// const MIME_TYPE_MAP = {
//     'image/png': 'png',
//     'image/jpeg': 'jpeg',
//     'image/jpg': 'jpg',
// };
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         console.log("aaaaaaaaaa",file)
//         const isValid = MIME_TYPE_MAP[file.mimetype];
//         let error = "";
//         if (!isValid) {
//             error = new Error("Invalid file type");
//         }
//         cb(error, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//         console.log("bbbbbbbbb",file)
//         let file_path = file.originalname;
//         console.log("jjjjjjjjjj",file_path)
//         let extension = file_path.split('.').pop();
//         console.log("vvvvvvvvvvv",extension)
//         let randomName = Math.random().toString(36).substring(2, 12);
//         const filenm = file.originalname;
//         const flName = Date.now() + '-' + filenm.replace(filenm, randomName);
//         console.log("kkkkkkkkk",flName)
//         const fileName = flName + '.' + extension;
//         console.log("ggggggggg",fileName)
//         const ext = MIME_TYPE_MAP[file.mimetype];
//         cb(null, fileName);
//     }
// });

// const upload = multer({
//     storage: storage,
// }).single('photo')
// Multer configuration
const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = isValid ? null : new Error("Invalid file type");
        cb(error, 'uploads/');
    },
    filename: (req, file, cb) => {
        let extension = MIME_TYPE_MAP[file.mimetype];
        let randomName = Math.random().toString(36).substring(2, 12);
        const fileName = Date.now() + '-' + randomName + '.' + extension;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

// Nodemailer transporter configuration
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, 
    secure: true, 
    auth: {
        user: 'tyagiiashi@gmail.com', 
        pass: 'cgcbnbolokohxdsb' 
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Helper function to log email details to the mail table
const logEmail = (from, to, subject, fullname, body, status) => {
    const query = `INSERT INTO mail (from_email , to_email , status , subject, fullname, body) 
                   VALUES ('${from}', '${to}', ${status} , '${subject}',  '${fullname}', '${body}')`;
    db.query(query, (err, result) => {
        if (err) {
            console.log(err, 'error sending email');
        } else {
            console.log(result, 'email sent successfully');
        }
    });
};


//get data
app.get('/list1',(req,res)=>{

    let qr = 'select * from list1';

    db.query(qr,(err,result)=>{
        if(err) {console.log("error")};
        if(result.length>0){
            res.send({
                data:result
            });
        }
    });
});

//get single data
app.get('/list1/:Rollno',(req,res)=>{

    let rno = req.params.Rollno;

    let qr = `select * from list1 where Rollno = ${rno}`;

    db.query(qr,(err,result)=>{
        if(err) {console.log("error")};
        if(result.length>0){
            res.send({
                data:result
            });
        }else{
            res.send({
                message:'does not exist'
            });
        }
    });
});

// Search data by name
app.get('/search', (req, res) => {
    const query = req.query.q;
    const searchQuery = `SELECT * FROM list1 WHERE Rollno LIKE '%${query}%' OR Firstname LIKE '%${query}%' OR Lastname LIKE '%${query}%'OR Email LIKE '%${query}%' OR Contact LIKE '%${query}%' OR Address LIKE '%${query}%'`;

    db.query(searchQuery, (err, result) => {
        if (err) {
            console.log(err, 'error searching data');
            res.status(500).send({ message: 'Error searching data' });
        } else {
            res.send({ data: result });
        }
    });
});

// Filter data based on form inputs
app.get('/filter', (req, res) => {
    const { firstname, lastname, email, contact, address } = req.query;

    let filterQuery = 'SELECT * FROM list1 WHERE 1=1';
    
    if (firstname) {
        filterQuery += ` AND Firstname = '${firstname}'`;
    }
    if (lastname) {
        filterQuery += ` AND Lastname = '${lastname}'`;
    }
    if (email) {
        filterQuery += ` AND Email = '${email}'`;
    }
    if (contact) {
        filterQuery += ` AND Contact = '${contact}'`;
    }
    if (address) {
        filterQuery += ` AND Address = '${address}'`;
    }

    db.query(filterQuery, (err, result) => {
        if (err) {
            console.log(err, 'error filtering data');
            res.status(500).send({ message: 'Error filtering data' });
        } else {
            res.send({ data: result });
        }
    });
});


//add user

app.post('/list1', upload.single('photo'), (req, res) => {
    console.log(req.body.data ? JSON.parse(req.body.data) : req.body, 'createdata');

    let data =req.body.data ? JSON.parse(req.body.data) : req.body;
    const numeric = '0123456789';
    let rno = '';
    for (let i = 0; i < 4; i++) {
        rno += numeric[Math.floor(Math.random() * numeric.length)];
    }

    let qr1 = "SELECT Email FROM list1 WHERE Email='" + data.email + "'";

    db.query(qr1, (err, result) => {
        if (err) {
            console.log(err);
            return res.send({ message: 'Error in query', status: 500 });
        }

        if (result.length == 0) {
            let photo = req.file.filename ;
            
            let filename = "http://localhost:3000/uploads/" + photo;
           

            let qr = "INSERT INTO list1 (Rollno, Firstname, Lastname, Email, Contact, Address, Photo, filepath) VALUES ('" + rno + "','" + data.firstname + "','" + data.lastname + "','" + data.email + "','" + data.contact + "','" + data.address + "','" + photo + "','" + filename + "')";
            

            db.query(qr, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.send({ message: 'Data not inserted', status: 500 });
                }

                console.log(result, 'result');
                res.send({ message: 'Data inserted', status: 201 });

                // Send email to the new user
                const mailOptions = {
                    from: 'mailto:tyagiiashi@gmail.com',
                    to: data.email,
                    subject: 'Student data added successfully',
                    text: `Hello ${data.firstname} ${data.lastname},\n\nYour information is successfully added. Here are your details:\n\nFirst Name: ${data.firstname}\nLast Name: ${data.lastname}\nEmail: ${data.email}\nContact: ${data.contact}\nAddress: ${data.address}\n\nThank you!`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    let status = 0;
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                        status = 1;
                    }

                    // Log email details 
                    logEmail(mailOptions.from, mailOptions.to , mailOptions.subject, rno, `${data.firstname} ${data.lastname}`, mailOptions.text, status);
                });
            });
        } else {
            res.send({ message: 'Email already exists', status: 500 });
        }
    });
});

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


//login
app.post('/login', (req, res) => {
    const data = req.body;

    const query = "SELECT * FROM logininfo WHERE email = '" + data.email + "' ";
    
    db.query(query, (err, result) => {
        if (err) {
            console.log(err, 'error checking email');
            res.status(500).send({ message: 'Internal server error' });
        } else if (result.length == 0) {

            res.status(404).send({ message: 'Your account does not exist' });
        } else {
            const user = result[0];
    
            const isPasswordMatch = bcrypt.compareSync(data.password, user.password);
            
            if (!isPasswordMatch) {
                res.status(401).send({ message: 'Password is incorrect' });
            } else {
                res.status(200).send({
                    message: 'Login successful',
                    
                });
            }
        }
    });
});



//signup
app.post('/signup',(req,res)=>{
    let data = req.body;
    const otp = generateOTP();
    const hashedPassword = bcrypt.hashSync(data.password, 8);

    const query = " INSERT INTO logininfo (firstname, lastname, email, password, otp, status)  VALUES ( '" + data.firstname + "', '" + data.lastname + "', '" + data.email + "', '" + hashedPassword + "', '" + otp + "', 0)" ;

    db.query(query, (err, result) => {
        if (err) {
            console.log(err, 'error in signup');
            res.status(500).send({ message: 'Signup failed' });
        } else {
            const userId = result.insertId; 
            const mailOptions = {
                from: 'tyagiiashi@gmail.com',
                to: data.email,
                subject: 'OTP Verification',
                text: `Your OTP for verification is: ${otp}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                let status = 0;
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                    status = 1;
                }
                logEmail(mailOptions.from, mailOptions.to, mailOptions.subject, `${data.firstname} ${data.lastname}`,mailOptions.text, status);
            });

            res.status(201).send({ message: 'Signup successful, OTP sent to email', userId: userId }); 
        }
        
    });
});

//verify otp
app.post('/verify-otp',(req,res)=>{
    let data  = req.body;

    const query = "SELECT * FROM logininfo WHERE id = '" + data.userId + "' AND otp = '" + data.otp + "' AND status = 0"; 
    db.query(query, (err, result) => {
        if (err) {
            console.log(err, 'error verifying otp');
            res.status(500).send({ message: 'OTP verification failed' });
        } else if (result.length > 0) {
            // const userId = result[0].id;
            const updateQuery = "UPDATE logininfo SET status = 1 WHERE id = '" + data.userId + "' ";
            db.query(updateQuery, (err, updateResult) => {
                if (err) {
                    console.log(err, 'error updating status');
                    res.status(500).send({ message: 'OTP verification failed' });
                } else {
                    const user = result[0];
                    const mailOptions = {
                        from: 'tyagiiashi@gmail.com',
                        to: user.email,
                        subject: 'OTP Verification Successful',
                        text: `Hello ${user.firstname} ${user.lastname},\n\nYour OTP has been successfully verified.\n\nThank you!`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        let status = 0;
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                            status = 1;
                        }
                        logEmail(mailOptions.from, mailOptions.to, mailOptions.subject,`${user.firstname} ${user.lastname}`, mailOptions.text, status);
                    });

                    res.status(200).send({ message: 'OTP verified successfully' });
                }
            });
        } else {
            res.status(400).send({ message: 'Invalid OTP' });
        }
    });

});

//resend otp
app.post('/resend-otp',(req,res)=>{
    let data  = req.body;
    const otp = generateOTP();

    const query = "SELECT * FROM logininfo WHERE id = '" + data.userId + "' "; 
    db.query(query, (err, result) => {
        if (err) {
            console.log(err, 'error fetching user for otp resend');
            res.status(500).send({ message: 'Error fetching user for OTP resend' });
        } else if (result.length > 0) {
            const updateQuery = "UPDATE logininfo SET otp = '" + otp + "', status = 0 WHERE id = '" + data.userId + "' "; 
            db.query(updateQuery, (err, updateResult) => {
                if (err) {
                    res.status(500).send({ message: 'Error updating OTP' });
                } else if (updateResult.affectedRows === 0) {
                    res.status(500).send({ message: 'Failed to update OTP' });
                } else {
                    const user = result[0];
                    const mailOptions = {
                        from: 'tyagiiashi@gmail.com',
                        to: user.email,
                        subject: 'OTP Resend',
                        text: `Your new OTP for verification is: ${otp}`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        let status = 0;
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                            status = 1;
                        }
                        logEmail(mailOptions.from, mailOptions.to, mailOptions.subject,`${user.firstname} ${user.lastname}`, mailOptions.text, status);
                    });
                }
            });
        } else {
            console.log('No user found with this email: '+ data.userId); 
            res.status(400).send({ message: 'No user found with this email' });
        }
    });
});



//update user

app.put('/list1/:Rollno', upload.single('photo'), (req,res)=>{

    console.log(req.body,'updatedata');
    console.log(req.body.data ? JSON.parse(req.body.data) : req.body, 'createdata');

    let data =req.body.data ? JSON.parse(req.body.data) : req.body;

    let grno = req.params.Rollno;
    console.log(grno);

    let qr1 = "SELECT Email from list1 where Email='"+data.data.email+"' AND Rollno != '" + grno + "'";

    db.query(qr1,(err,result)=>{
        if(result.length == 0) {
            let photo;
            let filename;

            if(req.file){
               photo =  req.file.filename;
               filename ="http://localhost:3000/uploads/" + photo;
            }
              else{
                 photo =  data.previousfile;
                 filename ="http://localhost:3000/uploads/" + photo;
              }
              let qr = " update list1 set Firstname = '"+data.data.firstname+"', Lastname = '"+data.data.lastname+"', Email = '"+data.data.email+"', Contact = '"+data.data.contact+"', Address = '"+data.data.address+"',Photo = '"+photo+"' , filepath = '"+filename+"' where Rollno = '"+grno+"' ";

                       console.log(qr,'qr')
                       db.query(qr,(err,result)=>{
                           if(err) {
                               console.log(err);
                               res.send({
                                    message:'Data not updated',status:500
                               });
                            }
                            else{
                               console.log(result,'result');
                               res.send({
                                   message:'Data updated',status:201
                               });

                               // Send email to the new user
                               const mailOptions = {
                                from: 'tyagiiashi@gmail.com',
                                to: data.data.email,
                                subject: 'Student data updated successfully',
                                text: `Hello ${data.data.firstname} ${data.data.lastname},\n\nYour information is successfully updated. Here are your details:\n\nFirst Name: ${data.data.firstname}\nLast Name: ${data.data.lastname}\nEmail: ${data.data.email}\nContact: ${data.data.contact}\nAddress: ${data.data.address}\n\nThank you!`
                                };

                                transporter.sendMail(mailOptions, (error, info) => {
                                    let status = 0;
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log('Email sent: ' + info.response);
                                        status = 1;
                                    }

                                    // Log email details
                                    logEmail(mailOptions.from, mailOptions.to , mailOptions.subject, grno, `${data.data.firstname} ${data.data.lastname}`, mailOptions.text, status);

                                });
                            }
                       
                        });
        }
        else{
           console.log(err);
            res.send({
                message:'Email already exists',status:500
            });
       }
       
   });            
});

//delete user

app.delete('/list1/:Rollno',(req,res)=>{

    let grno = req.params.Rollno;

    let qr = `delete from list1 where Rollno = '${grno}' `;
    db.query(qr,(err,result)=>{
        if(err) {
            console.log(err);
            res.send({
                message:'Data not deleted',status:500
            });
        }
        else{
            console.log(result,'result');
            res.send({
                message:'Data deleted',status:201
            });
        }
    });   

});

app.listen(3000,()=>{
    console.log("server running...");
});