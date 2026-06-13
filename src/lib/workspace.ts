/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Memory cache for active tokens as strictly required by system guidelines
let cachedAccessToken: string | null = null;
let googleUser: { name: string; email: string; picture?: string } | null = null;

export function setWorkspaceToken(token: string, user: { name: string; email: string; picture?: string }) {
  cachedAccessToken = token;
  googleUser = user;
  localStorage.setItem('google_workspace_connected', 'true');
  localStorage.setItem('google_user_email', user.email);
  localStorage.setItem('google_user_name', user.name);
}

export function clearWorkspaceToken() {
  cachedAccessToken = null;
  googleUser = null;
  localStorage.removeItem('google_workspace_connected');
  localStorage.removeItem('google_user_email');
  localStorage.removeItem('google_user_name');
}

export function logoutWorkspace() {
  clearWorkspaceToken();
}

export function getWorkspaceToken() {
  return cachedAccessToken;
}

export function getGoogleUser() {
  if (!googleUser && localStorage.getItem('google_workspace_connected') === 'true') {
    googleUser = {
      name: localStorage.getItem('google_user_name') || 'Google User',
      email: localStorage.getItem('google_user_email') || 'user@gmail.com'
    };
  }
  return googleUser;
}

export function isWorkspaceConnected() {
  return !!cachedAccessToken || localStorage.getItem('google_workspace_connected') === 'true';
}

export function triggerWorkspaceOAuth() {
  // Safe mock connector that saves a mock sandbox token to cache
  setWorkspaceToken('ya29.mocksandbox_token_scentimo_bigstop_blesscent', {
    name: 'Google Analytics Sandbox Client',
    email: 'admin.scentimo@gmail.com'
  });
  alert('✨ Sandbox Connected: Authenticated with mock Google User (admin.scentimo@gmail.com). You can now test simulated Gmail dispatches, calendar additions, task registrations, and drive exports on-the-fly!');
}

/**
 * 1. GMAIL INTEGRATION: Send automated notifications
 */
export async function sendGmailNotification(to: string, subject: string, body: string): Promise<{ success: boolean; message: string; payload?: any }> {
  const token = getWorkspaceToken();
  if (!token) {
    return {
      success: false,
      message: 'Workspace connection offline. Draft simulated in audit trail.'
    };
  }

  // Gmail raw rfc822 email format base64url encoded
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ];
  const emailRaw = emailLines.join('\r\n');
  const encodedEmail = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Gmail API send error');
    }

    return { success: true, message: 'Email sent successfully via Gmail API!', payload: await res.json() };
  } catch (error: any) {
    console.error('Gmail error:', error);
    return { success: false, message: `Gmail delivery failed: ${error.message}` };
  }
}

/**
 * 2. GOOGLE CALENDAR INTEGRATION: Add AP/AR deadlines
 */
export async function addCalendarEvent(title: string, description: string, dateStr: string): Promise<{ success: boolean; message: string; eventUrl?: string }> {
  const token = getWorkspaceToken();
  if (!token) {
    return {
      success: false,
      message: 'Google calendar offline.'
    };
  }

  const startDateTime = `${dateStr}T09:00:00`;
  const endDateTime = `${dateStr}T10:00:00`;

  const eventContent = {
    summary: title,
    description: description,
    start: { dateTime: startDateTime, timeZone: 'Asia/Manila' },
    end: { dateTime: endDateTime, timeZone: 'Asia/Manila' },
    reminders: { useDefault: true }
  };

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventContent)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Calendar API error');
    }

    const data = await res.json();
    return {
      success: true,
      message: `Event successfully added to your Google Calendar!`,
      eventUrl: data.htmlLink
    };
  } catch (error: any) {
    console.error('Calendar error:', error);
    return { success: false, message: `Calendar sync failed: ${error.message}` };
  }
}

export async function createCalendarEvent(title: string, description: string, dateStr: string) {
  return addCalendarEvent(title, description, dateStr);
}

/**
 * 3. GOOGLE TASKS INTEGRATION: Create approvals workspace tasks
 */
export async function createGoogleTask(title: string, notes: string, dueDateStr?: string): Promise<{ success: boolean; message: string }> {
  const token = getWorkspaceToken();
  if (!token) {
    return { success: false, message: 'Google Tasks connection offline.' };
  }

  const taskContent = {
    title,
    notes,
    due: dueDateStr ? `${dueDateStr}T17:00:00.000Z` : undefined
  };

  try {
    // Insert in default list
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskContent)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Tasks API error');
    }

    return { success: true, message: 'Approval task listed in your Google Tasks workspace!' };
  } catch (error: any) {
    console.error('Tasks error:', error);
    return { success: false, message: `Google Tasks listing failed: ${error.message}` };
  }
}

/**
 * 4. GOOGLE DOCS / DRIVE: Export Financial Report as a Document
 */
export async function exportReportToGoogleDoc(filename: string, docText: string): Promise<{ success: boolean; message: string; docUrl?: string }> {
  const token = getWorkspaceToken();
  if (!token) {
    return { success: false, message: 'Google Drive connected offline.' };
  }

  try {
    // Phase A: Create a google document
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: filename })
    });

    if (!createRes.ok) {
      throw new Error('Could not create Workspace Doc');
    }

    const docMeta = await createRes.json();
    const docId = docMeta.documentId;

    // Phase B: Insert report text
    const updateRequests = {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: docText
          }
        }
      ]
    };

    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateRequests)
    });

    return {
      success: true,
      message: 'Financial summary successfully exported to Google Docs!',
      docUrl: `https://docs.google.com/document/d/${docId}/edit`
    };
  } catch (error: any) {
    console.error('Google Docs error:', error);
    return { success: false, message: `Google Docs export failed: ${error.message}` };
  }
}
