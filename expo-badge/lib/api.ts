export type Ticket = {
  id: string;
  department: string;
  intent: string;
  urgency?: string;
  guest_name?: string;
  room_number?: string;
  [key: string]: unknown;
};

export type PostTranscriptResponse = {
  ticket: Ticket;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * POST a transcript to the backend's badge-transcript endpoint.
 *
 * @param backendUrl Full base URL, e.g. http://192.168.1.50:3000
 * @param transcript Raw transcribed text from the staff member
 * @param staffId Stable identifier for the badge wearer
 * @returns Parsed ticket from the server
 * @throws ApiError on non-2xx response or network failure
 */
export async function postTranscript(
  backendUrl: string,
  transcript: string,
  staffId: string,
): Promise<PostTranscriptResponse> {
  const trimmedBase = backendUrl.replace(/\/+$/, '');
  const url = `${trimmedBase}/api/badge-transcript`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transcript,
        staff_id: staffId,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(`Network error: ${msg}`, 0);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Bad JSON from server (status ${res.status})`, res.status);
  }

  if (!res.ok) {
    const errMsg =
      (body as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new ApiError(errMsg, res.status);
  }

  const ticket = (body as { ticket?: Ticket })?.ticket;
  if (!ticket || typeof ticket !== 'object') {
    throw new ApiError('Response missing ticket', res.status);
  }

  return { ticket };
}
