# Yourtube (YouTube Clone)

## Setting up Email Features
To implement the email invoicing and email OTP features, you need to use your own Google third-party app password (since Google no longer supports "less secure apps").

### Steps to configure Email:
1. Go to your Google Account management page.
2. Enable 2-Step Verification if it's not already enabled.
3. Go to "App Passwords" (you can search for it in your Google Account settings).
4. Create a new App Password for "Mail".
5. Copy the generated 16-character password.
6. Open your `.env` file in the `server` directory and configure the following variables:

```env
EMAIL_USER=your_google_email@gmail.com
EMAIL_PASS=your_16_character_app_password
```

Once configured, the application will automatically send OTP emails for login verification and invoice emails for plan upgrades.

## SMS OTP Demo Note
The SMS OTP for mobile numbers has been set to a "test demo" mode. When a mobile OTP is requested, the system will not actually send an SMS. Instead, the generated OTP will be shown directly as an alert popup in your browser saying it is for test purposes.
