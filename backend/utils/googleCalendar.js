const { google } = require("googleapis");
const { encrypt, decrypt } = require("./cryptoHelper");

const getOAuth2Client = () => {
  const hostUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

  if (!hostUrl) {
    console.warn(
      "[GoogleCalendar] BACKEND_URL is not set! OAuth callback will default to localhost. " +
      "Set BACKEND_URL in your .env (e.g. http://localhost:4001 for dev, or your production URL)."
    );
  }

  const callbackUrl = hostUrl
    ? `${hostUrl.replace(/\/+$/, "")}/api/auth/google/calendar/callback`
    : `http://localhost:${process.env.PORT || 4001}/api/auth/google/calendar/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
};

const getCalendarAuthUrl = (userId, from = "settings") => {
  const oauth2Client = getOAuth2Client();
  // Encode userId and origin page in state so callback knows where to redirect
  const state = JSON.stringify({ userId, from });
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // returns refresh_token
    prompt: "consent",      // forces refresh_token to be returned
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
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

  const decryptedTokens = decrypt(user.googleCalendarTokens);
  if (!decryptedTokens) {
    throw new Error("Failed to decrypt Google Calendar tokens — they may be corrupted");
  }

  let tokens;
  try {
    tokens = JSON.parse(decryptedTokens);
  } catch (parseErr) {
    throw new Error("Failed to parse Google Calendar tokens — invalid JSON");
  }

  if (!tokens.access_token && !tokens.refresh_token) {
    throw new Error("Google Calendar tokens are empty — no access_token or refresh_token");
  }

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
      console.log(`[GoogleCalendar] Successfully refreshed tokens for user ${user._id}`);
    } catch (err) {
      console.error("[GoogleCalendar] Failed to save refreshed calendar tokens:", err.message);
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
};

/**
 * Detect if a Google API error is an invalid_grant (tokens revoked/expired).
 * When this happens, auto-disconnect the user's calendar so they're prompted to reconnect.
 */
const isInvalidGrantError = (err) => {
  return err.message === "invalid_grant" ||
    err.message?.includes("invalid_grant") ||
    err.response?.data?.error === "invalid_grant";
};

const handleInvalidGrant = async (user) => {
  try {
    const User = require("../models/User");
    await User.findByIdAndUpdate(user._id, {
      googleCalendarTokens: "",
      googleCalendarConnected: false,
    });
    console.warn(`[GoogleCalendar] Auto-disconnected calendar for user ${user._id} due to invalid_grant — user must re-authorize`);
  } catch (disconnectErr) {
    console.error("[GoogleCalendar] Failed to auto-disconnect calendar:", disconnectErr.message);
  }
};

const createCalendarEvent = async (user, reminder) => {
  try {
    console.log(`[GoogleCalendar] Creating event for reminder "${reminder.title}"`);
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
    console.log(`[GoogleCalendar] Event created successfully: ${response.data.id}`);
    return response.data.id;
  } catch (err) {
    console.error("[GoogleCalendar] Failed to create event:", err.message);
    if (isInvalidGrantError(err)) {
      await handleInvalidGrant(user);
    }
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
    console.error("[GoogleCalendar] Failed to update Google Calendar event:", err.message);
    if (isInvalidGrantError(err)) {
      await handleInvalidGrant(user);
    }
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
    console.error("[GoogleCalendar] Failed to delete Google Calendar event:", err.message);
    if (isInvalidGrantError(err)) {
      await handleInvalidGrant(user);
    }
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
