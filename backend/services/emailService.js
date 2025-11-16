import { Resend } from 'resend';

const HARD_CODED_RESEND_KEY = 're_6ZEqYtEN_14wSn7Bo5DPxFo7uh9KFF1C1';

class EmailService {
    constructor() {
        this.resendApiKey = (process.env.RESEND_API_KEY || '').trim() || HARD_CODED_RESEND_KEY;
        this.senderEmail = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || 'onboarding@resend.dev').trim();
        this.senderName = process.env.EMAIL_FROM_NAME || 'TracNghiem Platform';
        this.replyToEmail = process.env.SUPPORT_EMAIL || this.senderEmail;
        this.resend = this.resendApiKey ? new Resend(this.resendApiKey) : null;

        this.logStartupInfo();
    }

    logStartupInfo() {
        console.log('='.repeat(60));
        console.log('📧 EMAIL SERVICE INITIALIZATION');
        console.log('='.repeat(60));
        console.log('  Provider  : Resend HTTP API');
        console.log('  API Key   :', this.resendApiKey ? '✅ CONFIGURED' : '❌ MISSING');
        console.log('  Sender    :', this.senderEmail || '❌ NOT SET');
        console.log('  SenderName:', this.senderName);
        console.log('  Reply-To  :', this.replyToEmail);
        console.log('='.repeat(60));

        if (!this.resendApiKey) {
            console.error('❌ RESEND_API_KEY is required. Emails will fail until it is provided.');
        }

        if (!this.senderEmail.includes('@')) {
            console.warn('⚠️ Sender email is invalid. Defaulting to onboarding@resend.dev');
            this.senderEmail = 'onboarding@resend.dev';
        }

        if (this.resend) {
            console.log('✅ Email service ready - Using Resend HTTP API\n');
        }
    }

    ensureClient() {
        if (!this.resend) {
            console.error('❌ Cannot send email: Resend API client is not initialized');
            return false;
        }
        return true;
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null) return 'N/A';
        const parsed = Number(amount);
        return Number.isNaN(parsed)
            ? amount
            : parsed.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }

    formatDate(dateInput) {
        if (!dateInput) return 'N/A';
        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) return dateInput;
        return date.toLocaleString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async sendEmail(to, subject, htmlContent) {
        if (!this.ensureClient()) {
            return { success: false, error: 'Resend API is not configured' };
        }

        if (!to) {
            return { success: false, error: 'Recipient email is required' };
        }

        try {
            console.log('\n📤 SENDING EMAIL');
            console.log('   To      :', to);
            console.log('   Subject :', subject);

            const payload = {
                from: `${this.senderName} <${this.senderEmail}>`,
                to: [to],
                subject,
                html: htmlContent,
                reply_to: this.replyToEmail
            };

            const { data, error } = await this.resend.emails.send(payload);

            if (error) {
                throw new Error(error.message || 'Unknown Resend API error');
            }

            console.log('✅ EMAIL SENT SUCCESSFULLY!');
            console.log('   Message ID:', data?.id || 'N/A');
            console.log('');
            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('❌ FAILED TO SEND EMAIL');
            console.error('   Error:', error.message);

            if (error?.response?.data) {
                console.error('   Resend Response:', JSON.stringify(error.response.data));
            }

            console.error('');
            return { success: false, error: error.message };
        }
    }

    async verifyConnection() {
        const ready = this.ensureClient();
        if (ready) {
            console.log('✅ Email service configured with Resend HTTP API');
        }
        return ready;
    }

    async sendPaymentSuccessEmail(userEmail, paymentData) {
        try {
            const htmlContent = this.generatePaymentSuccessHTML(paymentData || {});
            return await this.sendEmail(
                userEmail,
                '🎉 Thanh toán thành công - TracNghiem Platform',
                htmlContent
            );
        } catch (error) {
            console.error('❌ Failed to build payment email:', error.message);
            return { success: false, error: error.message };
        }
    }

    generatePaymentSuccessHTML(data) {
        const userName = data?.userName || 'bạn';
        const packageName = data?.packageName || 'Gói học tập nâng cao';
        const amount = this.formatCurrency(data?.amount || data?.price);
        const transactionId = data?.transactionId || data?.orderId || 'Đang cập nhật';
        const purchaseDate = this.formatDate(data?.purchaseDate || Date.now());

        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Thanh toán thành công</title>
            <style>
                body { margin:0; padding:0; font-family:Arial, sans-serif; background:#f3f4f6; color:#111827; }
                .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); }
                .header { background:linear-gradient(135deg,#059669,#10b981); color:#fff; padding:32px 24px; text-align:center; }
                .header h1 { margin:0; font-size:26px; }
                .badge { display:inline-block; background:rgba(255,255,255,0.15); padding:8px 18px; border-radius:999px; font-size:13px; letter-spacing:1px; margin-top:12px; }
                .content { padding:32px 24px; }
                .content h2 { margin-top:0; color:#065f46; }
                .details { margin:24px 0; border:1px solid #e5e7eb; border-radius:12px; }
                .detail-row { display:flex; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #e5e7eb; }
                .detail-row:last-child { border-bottom:none; }
                .detail-label { font-weight:600; color:#6b7280; }
                .detail-value { font-weight:700; color:#065f46; }
                .benefits { background:#ecfdf5; border-radius:12px; padding:20px; }
                .benefits ul { padding-left:20px; margin:12px 0 0 0; }
                .cta { text-align:center; margin-top:30px; }
                .cta a { background:#059669; color:#fff; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:600; display:inline-block; }
                .footer { text-align:center; padding:24px; background:#f9fafb; font-size:13px; color:#6b7280; }
                .footer a { color:#059669; text-decoration:none; font-weight:600; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thanh toán thành công!</h1>
                    <div class="badge">TracNghiem Platform</div>
                </div>
                <div class="content">
                    <p>Xin chào <strong>${userName}</strong>,</p>
                    <p>Cảm ơn bạn đã tin tưởng lựa chọn <strong>TracNghiem Platform</strong>. Gói học của bạn đã được kích hoạt đầy đủ quyền lợi.</p>
                    <div class="details">
                        <div class="detail-row">
                            <span class="detail-label">Gói đã mua</span>
                            <span class="detail-value">${packageName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Số tiền</span>
                            <span class="detail-value">${amount}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Mã giao dịch</span>
                            <span class="detail-value">${transactionId}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Thời gian</span>
                            <span class="detail-value">${purchaseDate}</span>
                        </div>
                    </div>
                    <div class="benefits">
                        <h2>Quyền lợi nổi bật</h2>
                        <ul>
                            <li>Truy cập không giới hạn toàn bộ thư viện đề thi và khóa học.</li>
                            <li>Tự động lưu lịch sử luyện thi và thống kê tiến độ.</li>
                            <li>Được hỗ trợ ưu tiên qua email và chat 1-1.</li>
                        </ul>
                    </div>
                    <div class="cta">
                        <a href="https://tracnghiem.online" target="_blank" rel="noopener">Vào học ngay</a>
                    </div>
                    <p>Nếu bạn cần hỗ trợ, hãy phản hồi email này hoặc liên hệ <a href="mailto:${this.replyToEmail}">${this.replyToEmail}</a>.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} TracNghiem Platform. Email được gửi tự động, vui lòng không trả lời trực tiếp.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async sendOTPEmail(userEmail, userName, otp) {
        const safeName = userName || 'bạn';
        const safeOtp = otp || '000000';
        const htmlContent = this.generateOTPEmailHTML(safeName, safeOtp);
        return await this.sendEmail(
            userEmail,
            '🔐 Mã xác thực OTP - TracNghiem Platform',
            htmlContent
        );
    }

    generateOTPEmailHTML(userName, otp) {
        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Mã OTP đăng ký</title>
            <style>
                body { margin:0; padding:0; font-family:Arial, sans-serif; background:#111827; color:#f9fafb; }
                .wrapper { background:#1f2937; max-width:520px; margin:0 auto; padding:32px 26px 40px; border-radius:18px; box-shadow:0 20px 45px rgba(15,23,42,0.6); }
                h1 { margin-top:0; font-size:24px; text-align:center; }
                .otp-box { background:#111827; border:2px dashed #3b82f6; border-radius:16px; padding:24px; text-align:center; margin:24px 0; }
                .otp-code { font-size:40px; letter-spacing:10px; font-weight:700; color:#60a5fa; }
                ul { padding-left:20px; color:#d1d5db; }
                a { color:#60a5fa; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <h1>Xác thực tài khoản</h1>
                <p>Xin chào <strong>${userName}</strong>,</p>
                <p>Chúng tôi vừa nhận được yêu cầu kích hoạt tài khoản của bạn tại TracNghiem Platform. Vui lòng nhập mã OTP bên dưới trong vòng 10 phút:</p>
                <div class="otp-box">
                    <div style="opacity:0.7; font-size:13px; margin-bottom:8px;">MÃ OTP CỦA BẠN</div>
                    <div class="otp-code">${otp}</div>
                    <div style="margin-top:12px; font-size:13px; color:#fbbf24;">Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</div>
                </div>
                <p style="margin-bottom:6px;">Một vài lưu ý nhỏ:</p>
                <ul>
                    <li>Mã OTP chỉ có hiệu lực trong 10 phút.</li>
                    <li>TracNghiem không bao giờ yêu cầu bạn đọc mã OTP qua điện thoại.</li>
                    <li>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email và đổi mật khẩu ngay.</li>
                </ul>
                <p style="margin-top:24px;">Cần hỗ trợ? Gửi email về <a href="mailto:${this.replyToEmail}">${this.replyToEmail}</a>.</p>
            </div>
        </body>
        </html>
        `;
    }

    async sendWelcomeEmail(userEmail, userName) {
        const safeName = userName || 'bạn học viên mới';
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Chào mừng đến với TracNghiem</title>
            <style>
                body { font-family:Arial, sans-serif; background:#fefce8; margin:0; padding:0; }
                .card { max-width:580px; margin:0 auto; background:#ffffff; border-radius:16px; padding:32px; box-shadow:0 15px 35px rgba(202,138,4,0.2); }
                h1 { color:#ca8a04; margin-top:0; }
                .cta { display:inline-block; margin-top:24px; background:#ca8a04; color:#fff; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:600; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Chào mừng ${safeName}!</h1>
                <p>Cảm ơn bạn đã tham gia cộng đồng luyện thi của TracNghiem Platform.</p>
                <p>Bạn có thể bắt đầu luyện đề, theo dõi tiến độ và mở khóa nhiều đặc quyền khi nâng cấp tài khoản Premium.</p>
                <a class="cta" href="https://tracnghiem.online" target="_blank" rel="noopener">Khám phá ngay</a>
            </div>
        </body>
        </html>
        `;

        return await this.sendEmail(
            userEmail,
            '🎉 Chào mừng đến với TracNghiem Platform',
            htmlContent
        );
    }
}

export default new EmailService();
