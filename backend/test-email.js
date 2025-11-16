import 'dotenv/config.js';
import emailService from './services/emailService.js';

async function testEmail() {
  console.log('🧪 Testing Email Service...\n');
  
  // Kiểm tra config
  console.log('📋 Email Configuration:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
  console.log('  EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME);
  console.log('');

  // Test connection
  console.log('🔌 Testing connection...');
  const verified = await emailService.verifyConnection();
  
  if (!verified) {
    console.error('❌ Email connection failed! Check your credentials.');
    process.exit(1);
  }
  
  console.log('✅ Connection successful!\n');

  // Test gửi OTP
  console.log('📧 Sending test OTP email...');
  const testEmail = process.env.EMAIL_USER; // Gửi cho chính mình để test
  const testOTP = '123456';
  
  const result = await emailService.sendOTPEmail(testEmail, 'TestUser', testOTP);
  
  if (result.success) {
    console.log('✅ OTP email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Check your email:', testEmail);
  } else {
    console.error('❌ Failed to send OTP email:', result.error);
  }
  
  console.log('\n🎉 Test completed!');
  process.exit(0);
}

testEmail().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
