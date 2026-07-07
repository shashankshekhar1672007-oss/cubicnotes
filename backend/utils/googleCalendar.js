const { google } = require("googleapis");
const { encrypt, decrypt } = require("./cryptoHelper");

const getOAuth2Client = () => {
  const callbackUrl = process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL}/api/auth/google/calendar/callback`
    : `http://localhost:${process.env.PORT || 4001}/api/auth/google/calendar/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
};

const getCalendarAuthUrl = (userId) => {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // returns refresh_token
    prompt: "consent",      // forces refresh_token to be returned
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: userId,
  });
};

const exchangeCodeForTokens = async (code) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

const getAuthorizedCalendar = (user) => {
  const oauth2Client = getOAuth2Client();
  if (!user.googleCalendarTokens) {
    throw new Error("No Google Calendar tokens found");
  }

  const tokens = JSON.parse(decrypt(user.googleCalendarTokens));
  oauth2Client.setCredentials(tokens);

  // Auto-save refreshed tokens to the user document
  oauth2Client.on("tokens", async (refreshedTokens) => {
    try {
      const currentTokens = JSON.parse(decrypt(user.googleCalendarTokens));
      const updatedTokens = {
        ...currentTokens,
        ...refreshedTokens,
      };
      user.googleCalendarTokens = encrypt(JSON.stringify(updatedTokens));
      // Save directly without triggering validation if unnecessary
      await user.save({ validateBeforeSave: false });
      console.log(`Successfully refreshed Google Calendar tokens for user ${user._id}`);
    } catch (err) {
      console.error("Failed to save refreshed calendar tokens:", err.message);
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
};

const createCalendarEvent = async (user, reminder) => {
  try {
    const calendar = getAuthorizedCalendar(user);
    const recurrence = [];
    if (reminder.repeat && reminder.repeat !== "none") {
      recurrence.push(`RRULE:FREQ=${reminder.repeat.toUpperCase()}`);
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: reminder.title,
        description: reminder.description || "Created via CubicNotes",
        start: {
          dateTime: new Date(reminder.triggerTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(new Date(reminder.triggerTime).getTime() + 30 * 60 * 1000).toISOString(),
          timeZone: "UTC",
        },
        recurrence: recurrence.length > 0 ? recurrence : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 10 },
            { method: "email", minutes: 30 }
          ]
        }
      }
    });
    return response.data.id;
  } catch (err) {
    console.error("Failed to create Google Calendar event:", err.message);
    return null;
  }
};

const updateCalendarEvent = async (user, eventId, reminder) => {
  try {
    const calendar = getAuthorizedCalendar(user);
    const recurrence = [];
    if (reminder.repeat && reminder.repeat !== "none") {
      recurrence.push(`RRULE:FREQ=${reminder.repeat.toUpperCase()}`);
    }

    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: reminder.title,
        description: reminder.description || "Created via CubicNotes",
        start: {
          dateTime: new Date(reminder.triggerTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(new Date(reminder.triggerTime).getTime() + 30 * 60 * 1000).toISOString(),
          timeZone: "UTC",
        },
        recurrence: recurrence.length > 0 ? recurrence : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 10 },
            { method: "email", minutes: 30 }
          ]
        }
      }
    });
    return true;
  } catch (err) {
    console.error("Failed to update Google Calendar event:", err.message);
    return false;
  }
};

const deleteCalendarEvent = async (user, eventId) => {
  try {
    const calendar = getAuthorizedCalendar(user);
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    return true;
  } catch (err) {
    console.error("Failed to delete Google Calendar event:", err.message);
    return false;
  }
};

module.exports = {
  getCalendarAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
