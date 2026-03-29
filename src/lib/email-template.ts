import "server-only";

interface EmailTemplateParams {
  previewText: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  actionLabel?: string;
  actionUrl?: string;
  closing?: string;
  footerNote?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildEmailHtml(params: EmailTemplateParams) {
  const preview = escapeHtml(params.previewText);
  const title = escapeHtml(params.title);
  const greeting = escapeHtml(params.greeting);
  const closing = escapeHtml(params.closing ?? "Regards,");
  const footerNote = escapeHtml(
    params.footerNote ??
      "If you did not expect this email, you can safely ignore it.",
  );

  const paragraphsHtml = params.paragraphs
    .map((paragraph) => `<p style=\"margin:0 0 14px 0;\">${escapeHtml(paragraph)}</p>`)
    .join("");

  const actionHtml =
    params.actionLabel && params.actionUrl
      ? `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin: 20px 0 14px 0;\"><tr><td style=\"border-radius:10px; background:#9f7000;\"><a href=\"${escapeHtml(params.actionUrl)}\" style=\"display:inline-block; padding:12px 20px; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600;\">${escapeHtml(params.actionLabel)}</a></td></tr></table><p style=\"margin:0 0 8px 0; color:#6b7280; font-size:12px;\">If the button does not work, copy and paste this link into your browser:</p><p style=\"margin:0; color:#374151; font-size:12px; word-break:break-word;\">${escapeHtml(params.actionUrl)}</p>`
      : "";

  return `<!doctype html>
<html lang=\"en\">
  <body style=\"margin:0; padding:0; background:#f5f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827;\">
    <span style=\"display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;\">${preview}</span>
    <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f5f6f8; padding:24px 12px;\">
      <tr>
        <td align=\"center\">
          <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:620px;\">
            <tr>
              <td style=\"padding:0 0 10px 4px; color:#6b7280; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;\">MUJ General</td>
            </tr>
            <tr>
              <td style=\"background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; padding:24px; box-shadow:0 1px 2px rgba(0,0,0,0.04);\">
                <h1 style=\"margin:0 0 14px 0; font-size:21px; line-height:1.3; color:#111827;\">${title}</h1>
                <p style=\"margin:0 0 16px 0; color:#111827; font-size:14px;\">${greeting}</p>
                <div style=\"font-size:14px; line-height:1.6; color:#374151;\">${paragraphsHtml}</div>
                ${actionHtml}
                <p style=\"margin:22px 0 0 0; color:#374151; font-size:14px;\">${closing}<br /><strong>MUJ General</strong></p>
              </td>
            </tr>
            <tr>
              <td style=\"padding:12px 4px 0 4px; color:#6b7280; font-size:12px; line-height:1.5;\">${footerNote}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailText(params: EmailTemplateParams) {
  const lines: string[] = [
    params.title,
    "",
    params.greeting,
    "",
    ...params.paragraphs,
  ];

  if (params.actionLabel && params.actionUrl) {
    lines.push("", `${params.actionLabel}: ${params.actionUrl}`);
  }

  lines.push(
    "",
    params.closing ?? "Regards,",
    "MUJ General",
    "",
    params.footerNote ??
      "If you did not expect this email, you can safely ignore it.",
  );

  return lines.join("\n");
}
