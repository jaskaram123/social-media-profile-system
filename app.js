// Getting all the required modules..
const imageDataURI = require('image-data-uri');
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require('crypto')
const path = require("path");
const fs = require('fs');
const app = express();
const port = 8000;

// using multer to upload profile photos to server...
const multer  = require('multer')
// const upload = multer({ dest: 'uploads/' })
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
  
var upload = multer({ storage: storage });

// Setting salt for the password hashing..
const saltRounds = 10;

// INTEGRATING NODEMAILER TO APPLICATION..
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  service: 'Gmail',
  auth: {
    user: 'jaskaramjitsidhu@gmail.com', // existing gmail user.
    pass: 'mdwaddwjpgszcrom', // generated application password from gmail account
  },
}); 

// Google sign in integration to application..
const { OAuth2Client } = require("google-auth-library");
const req = require("express/lib/request");
let CLIENT_ID =
  "1094604971939-cqtqptimcn5bporde0dvkiefqcv91phb.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

// connecting to mongoose and further..
async function main() {
  await mongoose.connect("mongodb://localhost/jass");
  console.log("we are connected");
}

main().catch((err) => console.log(err));

// Creating Schema for profile pictures and users registering..
const Schema = new mongoose.Schema({
  name: String,
  userid: String,
  email: String,
  passwordhash: String,
  picture: String,
  active: Array,
  via: String
});
const imgschema = new mongoose.Schema({
  filename: String,
  uid : String,
  img: {
    data: Buffer,
    contentType : String 
  }
})

// creating models for user and profile pics...
const imgsave = image = mongoose.model('imgsave', imgschema)
const user = mongoose.model("user", Schema);

// Express specific --
app.use("/static", express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

// integrating pug template engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Upload or updating users profile picture... and viewing the profile page..
app.get('/webchat/profile', (req, res) => {
  let alertsend = '';
  let removed;
  if(req.query.updated == 'UPDATED'){
    alertsend = 'USERNAME UPDATED.'
  }else if(req.query.updated == 'NOTUPDATED'){
    alertsend = 'USERNAME NOT UPDATED. TRY AGAIN'
  }
  if(req.session.useremail){
  if(req.cookies.webchat == 'true'){
    user.findOne({email: req.session.useremail}, (err, items) => {
      let verified = items.active[0]
      let user = items['_id'];
      async function searcing() {
        let search = await imgsave.findOne({uid: user})
        if(search){            
          let imgdata = search;
          let imgsend = imgdata.img.data.toString('base64')
          let imgtype = imgdata.img.contentType;
          if(req.query.removed == 'true'){
            removed = true;
          }else{
            removed = false;
          }
          res.render('profile', {username: req.session.userid, imgs: `data:${imgtype};base64,` + imgsend, email: req.session.useremail, alert: alertsend, verified: verified, removed: removed});
        }else{
          if(req.query.removed == 'true'){
            removed = true;
          }else{
            removed = false;
          }
          res.render('profile', {username: req.session.userid, email: req.session.useremail, alert: alertsend, verified: verified, removed: removed})
        }
      }
      searcing()
    }
    );}
    else if(req.cookies.webchat == 'false'){
      user.findOne({email: req.session.useremail}, (err, items) => {
        let verified = items.active[0]
        if(items['picture'] == 'none'){
          let ui = items['_id'];
          async function searcing() {
            let search = await imgsave.findOne({uid: ui})
            if(search){            
              let imgdata = search;
              let imgsend = imgdata.img.data.toString('base64')
              let imgtype = imgdata.img.contentType;
              if(req.query.removed == 'true'){
                removed = true;
              }else{
                removed = false;
              }
              res.render('profile', {username: req.session.userid, imgs: `data:${imgtype};base64,` + imgsend, email: req.session.useremail, alert: alertsend, verified: verified, google: 'true', removed: removed});
            }else{
              if(req.query.removed == 'true'){
                removed = true;
              }else{
                removed = false;
              }
              res.render('profile', {username: req.session.userid, email: req.session.useremail, alert: alertsend, verified: verified, google: 'true', removed: removed})
            }
          } 
          searcing()
        }else if(items['picture'] != 'none'){
        imageDataURI.encodeFromURL(items.picture).then((result) =>{
          let sender = result;
          if(req.query.removed == 'true'){
            removed = true;
          }else{
            removed = false;
          }
          res.render('profile', {username: req.session.userid, imgs: sender, email: req.session.useremail, alert: alertsend, verified: verified, google: 'true', removed: removed})
        }).catch((err)=> console.log(err))}
      }
      );
    }
    else if(req.cookies.useremail == undefined || req.cookies.webhcat == undefined){
      res.redirect('/login')
  }}else if(req.session.useremail == undefined){
    res.redirect('/login?sessionexp=0')
  }
})

app.post('/webchat/profileupload', upload.single('profilepic'), (req, res, next) => {
  if(req.file == undefined){ 
    res.redirect('/webchat/profile')
  }else{ 
    var obj = { 
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    } 
    async function finduser(){
      let test = await user.findOne({email: req.session.useremail})
      if(test.picture == 'none'){
        let update = await imgsave.findOne({uid: test['_id']})
        if(update){
          fs.unlinkSync(path.join(__dirname + '/uploads/' + update.filename))
          let que = await imgsave.updateOne(update, {img: obj.img, filename: req.file.filename})
        }else{
          let imguser = new imgsave({uid: test['_id'], img: obj['img'], filename: req.file.filename})
          imguser.save()
        }
        res.redirect('/webchat/profile')
      }else if(test.picture != 'none'){
          let imguser = new imgsave({uid: test['_id'], img: obj['img'], filename: req.file.filename})
          imguser.save()
          user.findOneAndUpdate({email: req.session.useremail}, {picture: 'none'}, function (err, results) {
            if(err){
              res.redirect('/webchat/profile')
            }
            res.redirect('/webchat/profile')
          })
      }
    } 
    finduser()
  }
});

app.post('/webchat/profileupdate', (req,res, next)=> {
  user.findOne({email: req.session.useremail}, (err, results)=>{
    if(err){
      res.redirect('/webchat/profile?updated=NOTUPDATED')
    }else{
      user.findOneAndUpdate({email: results.email}, {name: req.body.cusername}, function (err,result) {
        if(err){
          res.redirect('/webchat/profile?updated=NOTUPDATED')
        }else{
          req.session.userid = req.body.cusername;
          res.redirect('/webchat/profile?updated=UPDATED')
        }
      })
    }
  })
})

app.get('/webchat/removepic', (req, res)=>{
  if(req.session.useremail){
    user.findOne({email: req.session.useremail}, function (error, remve) {
      if(error){
        res.redirect('/webchat/profile?removed=0')
      }else if(remve){
        let uid = remve['_id'];
        if(remve.picture != 'none'){
          user.updateOne({email: req.session.useremail}, {picture: 'none'}, function (err,removeds) {
            if(err){
              res.redirect('/webchat/profile')
            }else{
              res.redirect('/webchat/profile?removed=true')
            }
          })
        }else{
          imgsave.findOne({uid: uid}, function(err, imgfind) {
            if(err){
              res.redirect('/webchat/profile')
            }else{
              fs.unlinkSync(path.join(__dirname + '/uploads/' + imgfind.filename))
                  imgsave.deleteOne({uid: uid}, function (err, deleted) {
                    if(err){
                      res.redirect('/webchat/profile')
                    }else{
                      res.redirect('/webchat/profile?removed=true')
                    }
                  })
            }
          })
        }
      }
    })
  }else{
    res.redirect('login')
  }
})
var sessions;//variable for starting sessions

// Get request to homepage or the signup page
app.get("/", (req, res) => {
    if(req.session.userid == undefined){
    res.status(200).render("index");//the user is not signed in sor signup page is opened
  }else{
    res.redirect('/webchat')// the user is signed in so redirected to main application page
  }
});

// setting up post request for google signin authorization and registering users...
app.post("/post", callback);// callback function defined below..

// get requet to applicatin main page
app.get("/webchat", check, (req, res) => {
    if(req.cookies.webchat){//check weather the uer is signed in or not..
      user.findOne({email: req.session.useremail}, function (err, resss) {
        if(resss.active[0]){
          res.status(200).render("webchat", { username: req.session.userid });//page for main application after logging in or signing up
        }else{
          res.status(200).render("webchat", { username: req.session.userid, message: 'YOUR ACCOUNT IS NOT VERIFIED.VERIFY TO USE APPLICATION', buttons: 'GET VERIFIED'});//page for main application after logging in or signing up
        }
      })
    }else{ 
        res.redirect('/login')// redirect to signing in page to login in and start using appllication
    }
  });
// get and post for logging in
app.get('/login', (req,res) => {
  if(req.query.done == 'true'){
    req.session.destroy()
    res.clearCookie('tokenloginpage')
    res.clearCookie('webchat')
    res.render('login', {alert: 'PASSWORD CHANGED'})
    return;
  }
  if(req.query.sessionexp == '0'){
    res.render('login', {alert: 'SESSION EXPIRED'})
  }else{
  if(req.query.deleted == 'true'){
    res.render('login', {alert: 'YOUR ACCOUNT HAS BEEN DELETED'})
  }else{
    res.status(200).render('login')}}//opening the login page for user to login...
})

// post request for logging in to application..
app.post('/login',(req, res)=>{
    res.cookie('webchat', true)//sets that the user has signed in with an account registered through appliation
    // recording the users input data
    var username = req.body.name;
    var email = req.body.email;
    var pass = req.body.categ;

    // defining an asynchronous function for starting the session for user..
    async function verifying() {
        let test = await user.findOne({ email: email });//checks weather the user is registered or not.. (EMAIL HAS TO BE UNIQUE OFCOURSE)
        if (test) {
            if(test.via == 'Google'){res.render('login', {alert: 'THIS EMAIL IS REGISTERED VIA GOOGLE. LOGIN USING GOOGLE'})}// if email is registered via google, then request is handeled at another endpoint
            if(test.via == 'webchat'){//email is registered via application
        if(username != test.name){res.render('login', {alert: 'USERNAME IS INCORRECT'})}//user's entered username not matches with database..
        if(username == test.name){//username mataches with database
            bcrypt.compare(pass, test.passwordhash, function(err, result) {//verifying weather the password is correct or not using bcrypt npm module
                if(result == true){//password matches
                    sessions = req.session;
                    sessions.userid = username;
                    sessions.useremail = email;
                    res.redirect('/webchat')
                }else{//password dismatches
                    res.render('login', {alert: 'INCORRECT PASSWORD TRY AGAIN'})
                }
            });}}
        } else {//no such user in databse
            res.render('login', {alert: 'USER NOT FOUND KINDLY REGISTER'})//can be made better by redirecting to signup page... but its fine
        }
      }
      verifying().catch(err=> console.log(err))//running and catching the error
})

// logging out the user and redirecting to login page , clearing session and cookies
app.get('/logout', (req,res) =>{
    req.session.destroy()
    res.clearCookie('tokenloginpage')
    res.clearCookie('webchat')
    res.redirect('/login')
})

// HITTING VERIFY ENDPOINT for verifying the email entered...
app.get('/webchat/verify', (req, res)=> {
  let test = user.findOne({email: req.session.useremail}, function (err, response) {
    if(err){
      console.log(err)//can be handeled better but it might not happen
    }else{
      if(response.active[0] == false){//checks if account is verified or not
        let vid = crypto.randomBytes(128).toString('hex')// generating random string of 128 chars everytime hitting the endpoint new string is associated with the account.. old one deletes
        user.findOneAndUpdate({email: req.session.useremail}, {active: [false, vid]}, function (err, resultup) {//attatching vid to userid
          transporter.sendMail({//sending mail
            from: 'WEBCHAT',
            to: req.session.useremail, 
            subject: "Account verification",
            text: vid, // plain text body
            html: `<!doctype html>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
              <head>
                <title>
                  
                </title>
                <!--[if !mso]><!-- -->
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <!--<![endif]-->
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style type="text/css">
                  #outlook a { padding:0; }
                  body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
                  table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
                  img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
                  p { display:block;margin:13px 0; }
                </style>
                <!--[if mso]>
                <xml>
                <o:OfficeDocumentSettings>
                  <o:AllowPNG/>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
                </xml>
                <![endif]-->
                <!--[if lte mso 11]>
                <style type="text/css">
                  .outlook-group-fix { width:100% !important; }
                </style>
                <![endif]-->
                
              <!--[if !mso]><!-->
                <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet" type="text/css">
                <style type="text/css">
                  @import url(https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700);
        @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);
        @import url(https://fonts.googleapis.com/css?family=Cabin:400,700);
                </style>
              <!--<![endif]-->
        
            
                
            <style type="text/css">
              @media only screen and (max-width:480px) {
                .mj-column-per-100 { width:100% !important; max-width: 100%; }
              }
            </style>
            
          
                <style type="text/css">
                
                
                </style>
                <style type="text/css">.hide_on_mobile { display: none !important;} 
                @media only screen and (min-width: 480px) { .hide_on_mobile { display: block !important;} }
                .hide_section_on_mobile { display: none !important;} 
                @media only screen and (min-width: 480px) { 
                    .hide_section_on_mobile { 
                        display: table !important;
                    } 
        
                    div.hide_section_on_mobile { 
                        display: block !important;
                    }
                }
                .hide_on_desktop { display: block !important;} 
                @media only screen and (min-width: 480px) { .hide_on_desktop { display: none !important;} }
                .hide_section_on_desktop { 
                    display: table !important;
                    width: 100%;
                } 
                @media only screen and (min-width: 480px) { .hide_section_on_desktop { display: none !important;} }
                
                  p, h1, h2, h3 {
                      margin: 0px;
                  }
        
                  ul, li, ol {
                    font-size: 11px;
                    font-family: Ubuntu, Helvetica, Arial;
                  }
        
                  a {
                      text-decoration: none;
                      color: inherit;
                  }
        
                  @media only screen and (max-width:480px) {
        
                    .mj-column-per-100 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-100 > .mj-column-per-75 { width:75%!important; max-width:75%!important; }
                    .mj-column-per-100 > .mj-column-per-60 { width:60%!important; max-width:60%!important; }
                    .mj-column-per-100 > .mj-column-per-50 { width:50%!important; max-width:50%!important; }
                    .mj-column-per-100 > .mj-column-per-40 { width:40%!important; max-width:40%!important; }
                    .mj-column-per-100 > .mj-column-per-33 { width:33.333333%!important; max-width:33.333333%!important; }
                    .mj-column-per-100 > .mj-column-per-25 { width:25%!important; max-width:25%!important; }
        
                    .mj-column-per-100 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-75 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-60 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-50 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-40 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-33 { width:100%!important; max-width:100%!important; }
                    .mj-column-per-25 { width:100%!important; max-width:100%!important; }
                }</style>
                
              </head>
              <body style="background-color:#76C6D4;">
                
                
              <div style="background-color:#76C6D4;">
                
              
              <!--[if mso | IE]>
              <table
                 align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
              >
                <tr>
                  <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
              <![endif]-->
            
              
              <div style="margin:0px auto;max-width:600px;">
                
                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                  <tbody>
                    <tr>
                      <td style="direction:ltr;font-size:0px;padding:9px 0px 9px 0px;text-align:center;">
                        <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        
                <tr>
              
                    <td
                       class="" style="vertical-align:top;width:600px;"
                    >
                  <![endif]-->
                    
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                
                    <tr>
                      <td align="left" style="font-size:0px;padding:15px 15px 15px 15px;word-break:break-word;">
                        
              <div style="font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.5;text-align:left;color:#000000;"><h1 style="font-family: 'Cabin', sans-serif; font-size: 22px; text-align: center;"><span style="font-family: 'Open Sans', sans-serif; font-size: 36px; color: #ecf0f1;"><strong>WEBCHAT</strong></span></h1></div>
            
                      </td>
                    </tr>
                  
              </table>
            
              </div>
            
                  <!--[if mso | IE]>
                    </td>
                  
                </tr>
              
                          </table>
                        <![endif]-->
                      </td>
                    </tr>
                  </tbody>
                </table>
                
              </div>
            
              
              <!--[if mso | IE]>
                  </td>
                </tr>
              </table>
              
              <table
                 align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
              >
                <tr>
                  <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
              <![endif]-->
            
              
              <div style="margin:0px auto;max-width:600px;">
                
                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                  <tbody>
                    <tr>
                      <td style="direction:ltr;font-size:0px;padding:9px 0px 9px 0px;text-align:center;">
                        <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        
                <tr>
              
                    <td
                       class="" style="vertical-align:top;width:600px;"
                    >
                  <![endif]-->
                    
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                
                    <tr>
                      <td align="left" style="font-size:0px;padding:15px 15px 15px 15px;word-break:break-word;">
                        
              <div style="font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.5;text-align:left;color:#000000;"><h2 style="font-size: 17px; font-family: Ubuntu, Helvetica, Arial; text-align: center;">VERIFICATION REQUEST FOR THIS ACCOUNT</h2></div>
            
                      </td>
                    </tr>
                  
              </table>
            
              </div>
            
                  <!--[if mso | IE]>
                    </td>
                  
                </tr>
              
                          </table>
                        <![endif]-->
                      </td>
                    </tr>
                  </tbody>
                </table>
                
              </div>
            
              
              <!--[if mso | IE]>
                  </td>
                </tr>
              </table>
              
              <table
                 align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
              >
                <tr>
                  <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
              <![endif]-->
            
              
              <div style="margin:0px auto;max-width:600px;">
                
                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                  <tbody>
                    <tr>
                      <td style="direction:ltr;font-size:0px;padding:9px 0px 9px 0px;text-align:center;">
                        <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        
                <tr>
              
                    <td
                       class="" style="vertical-align:top;width:600px;"
                    >
                  <![endif]-->
                    
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                
                    <tr>
                      <td align="center" vertical-align="middle" style="font-size:0px;padding:20px 20px 20px 20px;word-break:break-word;">
                        
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                <tr>
                  <td align="center" bgcolor="#04384D" role="presentation" style="border:none;border-radius:6px;cursor:auto;mso-padding-alt:9px 26px 9px 26px;background:#04384D;" valign="middle">
                    <p style="display: inline-block; background: #04384D; color: #ffffff; font-family: Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: normal; line-height: 22.5px; margin: 0; text-decoration: none; text-transform: none; padding: 9px 26px 9px 26px; mso-padding-alt: 0px; border-radius: 6px;">
                    <a href="http://localhost:8000/webchat/getverified?vid=${vid}" style="display: inline-block; color: white; font-family: Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: normal; line-height: 100%; margin: 0; text-decoration: none; text-transform: none; padding: 9px 26px 9px 26px; mso-padding-alt: 0px; border-radius: 4px;" target="_blank">VERIFY</a>
                    </p>
                  </td>
                </tr>
              </table>
            
                      </td>
                    </tr>
                  
                    <tr>
                      <td align="center" vertical-align="middle" style="font-size:0px;padding:20px 20px 20px 20px;word-break:break-word;">
                        
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                <tr>
                  <td align="center" bgcolor="#D4F1F4" role="presentation" style="border:none;border-radius:4px;cursor:auto;mso-padding-alt:9px 26px 9px 26px;background:#D4F1F4;" valign="middle">
                    <a href="http://localhost:8000/webchat/passwordchange?att=1&eid=${req.session.useremail}" style="display: inline-block; background: #D4F1F4; color: #000000; font-family: Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: normal; line-height: 100%; margin: 0; text-decoration: none; text-transform: none; padding: 9px 26px 9px 26px; mso-padding-alt: 0px; border-radius: 4px;" target="_blank">
                      <strong>THIS WASN'T ME</strong>
                    </a>
                  </td>
                </tr>
              </table>
            
                      </td>
                    </tr>
                  
              </table>
            
              </div>
            
                  <!--[if mso | IE]>
                    </td>
                  
                </tr>
              
                          </table>
                        <![endif]-->
                      </td>
                    </tr>
                  </tbody>
                </table>
                
              </div>
            
              
              <!--[if mso | IE]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            
            
              </div>
            
              </body>
            </html>`, // html body
          }, function (err, success) {//handles the email promise
            if(err){
              res.redirect('/webchat/profile')
            }else{
              res.render('verify', {message: 'AN EMAIL HAS BEEN SENT TO YOUR REGISTERED EMAIL ACCOUNT TO GET YOUR ACCOUNT VERIFIED.', username: req.session.userid, tt: 'VERIFY ACCOUNT'})
            }
          });
        })
      }else{//account already verified
        res.redirect('/webchat')
      }
    }
  })
})

app.get('/webchat/getverified', (req,res)=>{// the link sent in email to verify account..
  user.findOne({active : [false, req.query.vid]}, function (err, result) {
    if(result){
      user.updateOne({email: req.session.useremail}, {active: [true, null]}, function (err,success) {// database updated account verify status
        if(success){
          res.redirect('/webchat/profile')
        }
      })
    }else{
      res.render('verify', {message: 'ID EXPIRED KINDLY RETRY.'})// if user tries to verify via older sent mail
    }
  })
})

// Account deletion
app.get('/webchat/deleteacc', (req, res)=>{
  user.findOne({email: req.session.useremail}, function (err, userreq) {
    let uids = userreq['_id']
    imgsave.findOne({uid: uids}, function (err, found) {
      if(found){
        fs.unlinkSync(path.join(__dirname + '/uploads/' + found.filename))
        imgsave.deleteOne({uid: uids}, function (err, successdele) {
          if(successdele){
          user.deleteOne({email: req.session.useremail}, function (err, deleted) {
            if(err){
              res.redirect('/webchat/profile')
            }else{
              req.session.destroy()
              res.clearCookie('tokenloginpage')
              res.clearCookie('webchat')
              res.redirect('/login?deleted=true')
          }
          })}
        })
      }
      else if(err){
        res.redirect('/webchat/profile')
      }else{
        user.deleteOne({email: req.session.useremail}, function (err, deleted) {
                if(err){
                  res.redirect('/webchat/profile')
                }else if(deleted){
                  req.session.destroy()
                  res.clearCookie('tokenloginpage')
                  res.clearCookie('webchat')
                  res.redirect('/login?deleted=true')
              }
              })
      }
      
    })
  })
})

app.get('/webchat/passwordchange', (req, res)=> {
  if(req.query.att == '1'){
    res.render('passwordchange', {att: true, message: `CHANGE PASSWORD FOR ${req.query.eid}`,eid: req.query.eid})
    return;
  }else if(req.query.att == '0'){res.redirect('/login')}
  if(req.cookies.webchat == 'true'){
  if(req.session.useremail){
    let email = req.session.useremail;
    let locked = email.replace(/(^\w{3})(\w*)(@)/, '$1*****$3')
    res.render('passwordchange', {message: `CHANGE PASSWORD FOR ${locked}`})
  }else{
    res.redirect('/login')
  }}else{
    res.render('passwordchange', {alert: 'YOU CANNOT CHANGE PASSWORD. ACCOUNT IS REGISTERED VIA GOOGLE', google: true})
  }
})

app.post('/webchat/passwordchange', (req, res)=> {
  if(req.query.att == '1'){
    let eid = req.query.eid;
    let newpass = req.body.newpass;
    let cnewpass = req.body.cnewpass;
    let locked = eid.replace(/(^\w{3})(\w*)(@)/, '$1*****$3')
    if(newpass == cnewpass){
    user.findOne({email : eid}, function (err, theuser) {
      if(err){
        res.redirect('/login')
      }else if(theuser){
        bcrypt.compare(newpass, theuser.passwordhash, function(err, result) {
          if(result == true){
            res.render('passwordchange', {alert: 'YOUR PASSWORD CANNOT BE THE OLD PASSWORD',message: `CHANGE PASSWORD FOR ${eid}`,att: true, eid: req.query.eid})
          }else{
            bcrypt.hash(newpass, saltRounds, function (err, hash) {
              user.findOneAndUpdate({email: eid}, {passwordhash: hash}, function (err, doneornot) {
                if(err){
                  res.render('passwordchange',  {alert: 'SOME ERROR OCCURED TRY AGAIN.', message: `CHANGE PASSWORD FOR ${eid}`})
                }else if(doneornot){
                  res.redirect('/login?done=true')
                }
              })
            });
          }
        })
      }
    })}else{
      res.render('passwordchange', {alert: 'PASSWORDS DONOT MATCH TRY AGAIN', message: `CHANGE PASSWORD FOR ${eid}`,att: true, eid: req.query.eid})
    }
    return;
  }
  let oldpass = req.body.oldpass;
  let newpass = req.body.newpass;
  let cnewpass = req.body.cnewpass;
  let email = req.session.useremail;
  let locked = email.replace(/(^\w{3})(\w*)(@)/, '$1*****$3')
  if(req.session.useremail){
  user.findOne({email : req.session.useremail}, function (err, theuser) {
    if(err){
      res.redirect('/login')
    }else if(theuser){
      bcrypt.compare(oldpass, theuser.passwordhash, function(err, result) {//verifying weather the password is correct or not using bcrypt npm module
        if(result == true){//password matches
          if(newpass == cnewpass){
            bcrypt.hash(newpass, saltRounds, function (err, hash) {
              user.findOneAndUpdate({email: req.session.useremail}, {passwordhash: hash}, function (err, doneornot) {
                if(err){
                  res.render('passwordchange',  {alert: 'SOME ERROR OCCURED TRY AGAIN.', message: `CHANGE PASSWORD FOR ${locked}`})
                }else if(doneornot){
                  res.redirect('/login?done=true')
                }
              })

            });
          }else{
            res.render('passwordchange', {alert: 'PASSWORDS DONOT MATCH TRY AGAIN', message: `CHANGE PASSWORD FOR ${locked}`})
          }
        }else{//password dismatches
            res.render('passwordchange', {alert: 'INCORRECT OLD PASSWORD TRY AGAIN', message: `CHANGE PASSWORD FOR ${locked}`})
        }
    })
    }
  })}else{
    res.redirect('/login')
  }
  
})

// Signing in post request for signing in through website
app.post("/", (req, res) => {
    // storing user data..
  var username = req.body.name;
  var email = req.body.email;
  var pass = req.body.categ;
  var cpass = req.body.timing;
  var picture = 'none'
//   verifying user data with database and passord confirmation..
  async function verifying() {
    let test = await user.findOne({ email: email });
    if(test == null){// checks if email is already in db or not
        if (pass != cpass) {
            res.render("index", { alert: "PASSWORDS DONOT MATCH TRY AGAIN" });
          } else {
            //   hashing users password for secure entry to database
            bcrypt.hash(pass, saltRounds, function (err, hash) {
              let usersave = new user({//creating user object
                name: username,
                email: email,
                passwordhash: hash,
                picture: picture,
                active: [false, null],
                via: "webchat",
              });
            //   uploadiing data to datbase via mongoose
              usersave.save();
              sessions = req.session;
              sessions.userid = username;
              sessions.useremail = email;
              res.cookie('webchat', true)
              res.redirect('/webchat')
            });
        }
    }else{
          res.render("index", {
            alert: "EMAIL ALREADY TAKEN: TRY LOGGING IN OR USE OTHER EMAIL.",
          });
    }
}
verifying();
})

// call back function of server requests... for signing in
// code for initial signing in to google
function callback(req, res, next) {
    res.cookie('webchat', false)
  let token = req.body.idtoken;
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userid = payload["sub"];
    const profilepicture = payload['picture']
    let users = new user({
      name: payload["name"],
      email: payload["email"],
      passwordhash: payload["at_hash"],
      active: [true, null],
      picture: profilepicture,
      via: "Google",
    });
    let test = await user.findOne({ email: payload["email"] });//if uer is registered
    if(test){//if user is found start session directly
    if(test.via == 'webchat'){
        res.send('error')//if email is registered via application 
    }else{//email registered via google
      sessions = req.session;
      if(test.name != payload['name']){
        sessions.userid = test.name;
      }else{
      sessions.userid = payload["name"];}
      sessions.useremail = payload['email']
      res.cookie("tokenloginpage", req.body.idtoken);
      res.send('success')
    }
  }
    else{//save usedr and start session
        users.save();
        sessions = req.session;
        sessions.userid = payload["name"];
        sessions.useremail = payload['email']
        res.cookie("tokenloginpage", req.body.idtoken);
        res.send('success')
    }
  }
  verify().catch(console.error);
}

// callback for successive signingin to google
function check(req, res, next) {
    if(req.cookies.webchat){
        next()
    }
    else{
  let token = req.cookies['tokenloginpage'];
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userid = payload["sub"];
    let test = await user.findOne({ email: payload["email"] });
    if (test) {
      sessions = req.session;
      sessions.userid = payload["name"];
      sessions.useremail = payload['email']
    }else{
        res.redirect('/login')
    }
  }
  verify().catch(console.error);
  next()}
}

// Server listener--
app.listen(port, () => {
  console.log("listening on port 80 thanks.");
});
