import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function passwordResetTemplate(resetUrl: string, name: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;">
      <h2 style="color:#655d4f;">VersaHome — Password Reset</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#655d4f;color:#fff;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#888;font-size:12px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
}

export function rentalReminderTemplate(
  tenantName: string,
  assetLabel: string,
  dueDate: string,
  amount: number,
  daysLeft: number
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;">
      <h2 style="color:#655d4f;">VersaHome — Rental Payment Reminder</h2>
      <p>Dear ${tenantName},</p>
      <p>This is a friendly reminder that your rental payment is due in <strong>${daysLeft} day(s)</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#ede1cf;">
          <td style="padding:8px 12px;font-weight:bold;">Unit / Asset</td>
          <td style="padding:8px 12px;">${assetLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Due Date</td>
          <td style="padding:8px 12px;">${dueDate}</td>
        </tr>
        <tr style="background:#ede1cf;">
          <td style="padding:8px 12px;font-weight:bold;">Amount</td>
          <td style="padding:8px 12px;">RM ${amount.toFixed(2)}</td>
        </tr>
      </table>
      <p>Please make your payment on time to avoid any late charges.</p>
      <p style="color:#888;font-size:12px;">VersaHome Property Management</p>
    </div>
  `;
}

export function leaseExpiryTemplate(
  tenantName: string,
  assetLabel: string,
  expiryDate: string,
  daysLeft: number
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;">
      <h2 style="color:#655d4f;">VersaHome — Lease Expiry Notice</h2>
      <p>Dear ${tenantName},</p>
      <p>Your tenancy agreement is expiring in <strong>${daysLeft} day(s)</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#ede1cf;">
          <td style="padding:8px 12px;font-weight:bold;">Unit / Asset</td>
          <td style="padding:8px 12px;">${assetLabel}</td>
        </tr>
        <tr style="background:#ede1cf;">
          <td style="padding:8px 12px;font-weight:bold;">Expiry Date</td>
          <td style="padding:8px 12px;">${expiryDate}</td>
        </tr>
      </table>
      <p>Please contact us to discuss renewal options.</p>
      <p style="color:#888;font-size:12px;">VersaHome Property Management</p>
    </div>
  `;
}
