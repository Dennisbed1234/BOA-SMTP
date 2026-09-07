import crypto from "crypto";
import { sql } from "@/lib/db";
import { sendMail } from "@/lib/mail";

const BATCH_SIZE = 5;

export async function processCampaign(campaignId: string) {
  const campaigns = await sql`
    SELECT
      id,
      subject,
      text_body,
      html_body,
      attachment_data,
      attachment_filename,
      attachment_content_type,
      status
    FROM campaigns
    WHERE id = ${campaignId}
    LIMIT 1
  `;

  if (campaigns.length === 0) {
    throw new Error("Campaign not found");
  }

  const campaign = campaigns[0];

  const recipients = await sql`
    SELECT
      id,
      email
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
      AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
  `;

  if (recipients.length === 0) {
    await sql`
      UPDATE campaigns
      SET
        status = 'completed',
        completed_at = NOW()
      WHERE id = ${campaignId}
    `;

    return {
      processed: 0,
      remaining: 0,
      status: "completed"
    };
  }

  await sql`
    UPDATE campaigns
    SET status = 'sending'
    WHERE id = ${campaignId}
  `;

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const attachments = [];

      if (
        campaign.attachment_data &&
        campaign.attachment_filename
      ) {
        attachments.push({
          filename: campaign.attachment_filename,
          content: Buffer.from(
            campaign.attachment_data
          ),
          contentType:
            campaign.attachment_content_type ||
            undefined
        });
      }

      await sendMail({
        to: recipient.email,
        subject: campaign.subject,
        text: campaign.text_body || undefined,
        html: campaign.html_body || undefined,
        attachments
      });

      await sql`
        UPDATE campaign_recipients
        SET
          status = 'sent',
          sent_at = NOW(),
          error_message = NULL
        WHERE id = ${recipient.id}
      `;

      await sql`
        INSERT INTO emails (
          id,
          sender,
          recipient,
          subject,
          text_body,
          html_body,
          message_type
        )
        VALUES (
          ${crypto.randomUUID()},
          ${process.env.MAIL_FROM || process.env.SMTP_USER || ""},
          ${recipient.email},
          ${campaign.subject},
          ${campaign.text_body},
          ${campaign.html_body},
          'campaign'
        )
      `;

      sent++;

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      await sql`
        UPDATE campaign_recipients
        SET
          status = 'failed',
          error_message = ${message}
        WHERE id = ${recipient.id}
      `;

      failed++;
    }
  }

  const remainingResult = await sql`
    SELECT COUNT(*)::int AS count
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
      AND status = 'pending'
  `;

  const remaining = Number(
    remainingResult[0]?.count || 0
  );

  if (remaining === 0) {
    await sql`
      UPDATE campaigns
      SET
        status = 'completed',
        completed_at = NOW()
      WHERE id = ${campaignId}
    `;
  }

  return {
    processed: recipients.length,
    sent,
    failed,
    remaining,
    status:
      remaining === 0
        ? "completed"
        : "sending"
  };
}