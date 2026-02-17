export const EMAIL_STYLES = {
    colors: {
        primary: '#1B5E7E', // Deep teal
        secondary: '#2B7A9B', // Button color
        background: '#FFFFFF',
        text: '#333333',
        gray: '#F5F5F5',
    },
}

export function generateEmailHtml(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: ${EMAIL_STYLES.colors.primary}; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .tagline { font-size: 12px; opacity: 0.8; letter-spacing: 1px; }
    .content { padding: 30px; color: ${EMAIL_STYLES.colors.text}; line-height: 1.6; }
    .footer { background-color: ${EMAIL_STYLES.colors.gray}; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .btn { display: inline-block; background-color: ${EMAIL_STYLES.colors.secondary}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .info-box { background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-label { font-weight: bold; color: #555; }
    @media only screen and (max-width: 600px) {
        .content { padding: 20px; }
    }
</style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="logo">edUmeetup</div>
            <div class="tagline">WHERE DREAMS MEET DESTINATIONS</div>
        </div>

        <!-- BODY -->
        <div class="content">
            <h1 style="font-size: 24px; color: ${EMAIL_STYLES.colors.primary}; margin-bottom: 20px; text-align: center;">${title}</h1>
            ${content}
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} edUmeetup | jaydeep@edumeetup.com</p>
            <p><a href="https://www.edumeetup.com" style="color: #666;">www.edumeetup.com</a></p>
            <p style="margin-top: 10px; opacity: 0.7;">You received this because you have an account on edumeetup.com</p>
        </div>
    </div>
</body>
</html>
`
}
