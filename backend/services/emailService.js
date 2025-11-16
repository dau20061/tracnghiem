import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Kiểm tra có Brevo API key không
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.useBrevoAPI = !!this.brevoApiKey;
    
    if (this.useBrevoAPI) {
      console.log('📧 Using Brevo HTTP API (no SMTP blocking)');
    } else {
      // Fallback to Gmail SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      console.log('📧 Using Gmail SMTP');
    }
  }

  // Gửi email qua Brevo HTTP API
  async sendViaBrevoAPI(to, subject, htmlContent) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: process.env.EMAIL_FROM_NAME || 'TracNghiem Platform',
            email: process.env.BREVO_USER || process.env.EMAIL_USER
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Brevo API error');
      }

      const data = await response.json();
      console.log('📧 Email sent via Brevo API:', data.messageId);
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error('❌ Brevo API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Kiểm tra kết nối email
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service ready');
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error.message);
      return false;
    }
  }

  // Gửi email thông báo thanh toán thành công
  async sendPaymentSuccessEmail(userEmail, paymentData) {
    try {
      const { userName, packageName, amount, transactionId, purchaseDate } = paymentData;

      const htmlContent = this.generatePaymentSuccessHTML({
        userName,
        packageName,
        amount,
        transactionId,
        purchaseDate
      });

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Thanh toán thành công - TracNghiem Platform',
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  // Template HTML cho email thông báo thanh toán
  generatePaymentSuccessHTML(data) {
    const { userName, packageName, amount, transactionId, purchaseDate } = data;
    
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thanh toán thành công</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
                background-color: #f5f5f5;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }
            .content {
                padding: 30px 20px;
            }
            .success-badge {
                background: #10b981;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                display: inline-block;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .greeting {
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
            }
            .details-box {
                background: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #10b981;
            }
            .detail-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            .detail-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .detail-label {
                font-weight: 600;
                color: #374151;
            }
            .detail-value {
                color: #10b981;
                font-weight: 600;
            }
            .cta-section {
                text-align: center;
                margin: 30px 0;
            }
            .cta-button {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .benefits {
                background: #f0fdf4;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .benefits h3 {
                color: #059669;
                margin: 0 0 15px 0;
                font-size: 18px;
            }
            .benefits ul {
                margin: 0;
                padding-left: 20px;
                color: #374151;
            }
            .benefits li {
                margin-bottom: 8px;
            }
            .footer {
                background: #f9fafb;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }
            .footer a {
                color: #10b981;
                text-decoration: none;
            }
            .social-links {
                margin: 15px 0;
            }
            .social-links a {
                display: inline-block;
                margin: 0 10px;
                color: #10b981;
                text-decoration: none;
            }
            @media (max-width: 600px) {
                .detail-item {
                    flex-direction: column;
                    gap: 5px;
                }
                .header h1 {
                    font-size: 24px;
                }
                .content {
                    padding: 20px 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🎉 Thanh toán thành công!</h1>
                <p>Chúc mừng bạn đã nâng cấp tài khoản thành công</p>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="success-badge">
                    ✅ THANH TOÁN HOÀN TẤT
                </div>
                
                <div class="greeting">
                    Xin chào <strong>${userName || 'Bạn'}</strong>,
                </div>
                
                <p>Cảm ơn bạn đã tin tướng và sử dụng dịch vụ của <strong>TracNghiem Platform</strong>. 
                Thanh toán của bạn đã được xử lý thành công!</p>

                <!-- Chi tiết thanh toán -->
                <div class="details-box">
                    <h3 style="margin: 0 0 15px 0; color: #059669;">📋 Chi tiết thanh toán</h3>
                    <div class="detail-item">
                        <span class="detail-label">Gói đã mua:</span>
                        <span class="detail-value">${packageName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Số tiền:</span>
                        <span class="detail-value">${amount}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Mã giao dịch:</span>
                        <span class="detail-value">${transactionId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ngày thanh toán:</span>
                        <span class="detail-value">${purchaseDate}</span>
                    </div>
                </div>

                <!-- Quyền lợi -->
                <div class="benefits">
                    <h3>🚀 Quyền lợi bạn nhận được:</h3>
                    <ul>
                        <li>✅ Truy cập không giới hạn tất cả khóa học</li>
                        <li>✅ Làm bài thi không giới hạn</li>
                        <li>✅ Xem kết quả chi tiết và thống kê</li>
                        <li>✅ Tải tài liệu học tập</li>
                        <li>✅ Hỗ trợ khách hàng ưu tiên</li>
                    </ul>
                </div>

                <!-- Call to Action -->
                <div class="cta-section">
                    <p>Bắt đầu hành trình học tập của bạn ngay hôm nay!</p>
                    <a href="http://localhost:5173/courses" class="cta-button">
                        🚀 Vào học ngay
                    </a>
                </div>

                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email 
                    <a href="mailto:support@tracnghiem.com" style="color: #10b981;">support@tracnghiem.com</a> 
                    hoặc hotline <strong>1900 xxxx</strong>.
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>TracNghiem Platform</strong> - Nền tảng học tập trực tuyến hàng đầu</p>
                <div class="social-links">
                    <a href="#">Facebook</a> |
                    <a href="#">YouTube</a> |
                    <a href="#">Website</a>
                </div>
                <p>© 2024 TracNghiem Platform. All rights reserved.</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động, vui lòng không reply.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Gửi email OTP xác thực
  async sendOTPEmail(userEmail, userName, otp) {
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
                .otp-box { background: #eff6ff; border: 2px dashed #2563eb; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .otp-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; }
                .content { line-height: 1.8; color: #333; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Xác thực tài khoản</h1>
                </div>
                <div class="content">
                    <p>Xin chào <strong>${userName}</strong>,</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>TracNghiem Platform</strong>!</p>
                    <p>Để hoàn tất quá trình đăng ký, vui lòng nhập mã OTP bên dưới:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">MÃ XÁC THỰC CỦA BẠN</p>
                        <div class="otp-code">${otp}</div>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px;">Mã có hiệu lực trong <strong>10 phút</strong></p>
                    </div>

                    <div class="warning">
                        <strong>⚠️ Lưu ý bảo mật:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Không chia sẻ mã OTP này với bất kỳ ai</li>
                            <li>TracNghiem sẽ không bao giờ yêu cầu mã OTP qua điện thoại</li>
                            <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email</li>
                        </ul>
                    </div>

                    <p>Nếu bạn gặp vấn đề, vui lòng liên hệ: <a href="mailto:${process.env.EMAIL_USER}" style="color: #2563eb;">${process.env.EMAIL_USER}</a></p>
                </div>
                <div class="footer">
                    <p><strong>TracNghiem Platform</strong></p>
                    <p>© 2024 TracNghiem. All rights reserved.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Email này được gửi tự động, vui lòng không reply.</p>
                </div>
            </div>
        </body>
        </html>
      `;

    // Dùng Brevo API nếu có
    if (this.useBrevoAPI) {
      return this.sendViaBrevoAPI(
        userEmail,
        '🔐 Mã xác thực OTP - TracNghiem Platform',
        htmlContent
      );
    }

    // Fallback SMTP
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🔐 Mã xác thực OTP - TracNghiem Platform',
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 OTP email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Gửi email chào mừng
  async sendWelcomeEmail(userEmail, userName) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
                .header { text-align: center; color: #10b981; margin-bottom: 30px; }
                .content { line-height: 1.6; color: #333; }
                .cta { text-align: center; margin: 30px 0; }
                .button { background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Chào mừng đến với TracNghiem!</h1>
                </div>
                <div class="content">
                    <p>Xin chào <strong>${userName}</strong>,</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại TracNghiem Platform. Chúng tôi rất vui khi có bạn trong cộng đồng học tập của chúng tôi!</p>
                    <p>Hãy khám phá các khóa học miễn phí và nâng cấp tài khoản để trải nghiệm đầy đủ các tính năng.</p>
                    <div class="cta">
                        <a href="http://localhost:5173" class="button">Bắt đầu học ngay</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `;

    // Dùng Brevo API nếu có
    if (this.useBrevoAPI) {
      return this.sendViaBrevoAPI(
        userEmail,
        '🎉 Chào mừng đến với TracNghiem Platform',
        htmlContent
      );
    }

    // Fallback SMTP
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Chào mừng đến với TracNghiem Platform',
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Welcome email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();