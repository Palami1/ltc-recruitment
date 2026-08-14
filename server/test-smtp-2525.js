require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false, // false for 2525 (uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mailOptions = {
  from: `"LTC Test" <${process.env.SENDER_EMAIL}>`,
  to: process.env.ADMIN_EMAIL,
  subject: 'Test Email via Port 2525',
  text: 'Hello, this is a test email sent using nodemailer on port 2525!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error sending email:', error.message);
  } else {
    console.log('Email sent successfully:', info.response);
  }
});
