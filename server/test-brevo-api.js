require('dotenv').config();

async function testBrevo() {
  const apiKey = process.env.SMTP_PASS;
  const senderEmail = process.env.SENDER_EMAIL || 'palamiphomaly@gmail.com';
  const adminEmail = process.env.ADMIN_EMAIL || senderEmail;

  console.log('Sending email using Brevo HTTP API...');
  console.log('Sender:', senderEmail);
  console.log('Recipient:', adminEmail);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'LTC Recruitment Test',
          email: senderEmail
        },
        to: [
          {
            email: adminEmail,
            name: 'LTC Admin'
          }
        ],
        subject: 'ทดสอบ Brevo API Test',
        htmlContent: '<p>This is a test email sent from Brevo HTTP API!</p>'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testBrevo();
