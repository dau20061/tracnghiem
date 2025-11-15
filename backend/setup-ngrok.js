const fs = require('fs');
const path = require('path');

// Script to update .env with ngrok URL
function updateEnvWithNgrokUrl(ngrokUrl) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update callback URL
    envContent = envContent.replace(
      /ZALOPAY_CALLBACK_URL=.*/,
      `ZALOPAY_CALLBACK_URL=${ngrokUrl}/api/payments/zalopay/callback`
    );
    
    // Update ngrok URL
    envContent = envContent.replace(
      /NGROK_URL=.*/,
      `NGROK_URL=${ngrokUrl}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env with ngrok URL: ${ngrokUrl}`);
    console.log(`📞 Callback URL: ${ngrokUrl}/api/payments/zalopay/callback`);
  } catch (error) {
    console.error('❌ Error updating .env:', error.message);
  }
}

// Get ngrok URL from command line argument
const ngrokUrl = process.argv[2];

if (!ngrokUrl) {
  console.log('Usage: node setup-ngrok.js <ngrok-url>');
  console.log('Example: node setup-ngrok.js https://abc123.ngrok.io');
  process.exit(1);
}

// Validate URL format
if (!ngrokUrl.startsWith('https://') || !ngrokUrl.includes('.ngrok.io')) {
  console.error('❌ Invalid ngrok URL format. Should be like: https://abc123.ngrok.io');
  process.exit(1);
}

updateEnvWithNgrokUrl(ngrokUrl);