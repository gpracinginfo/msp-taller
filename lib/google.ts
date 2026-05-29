import { google } from 'googleapis';

export const boardCalendarColor: Record<string, string> = {
  // Google Calendar event colorId:
  // 4  = rosa / fucsia
  // 9  = azul
  // 10 = verde
  particulares: '4',
  chapa: '9',
  vtc: '10'
};

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar'
    ],
    state
  });
}