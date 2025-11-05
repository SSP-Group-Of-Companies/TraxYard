import { ApiError } from "./ApiError";

export function mapApiErrorToFriendly(err: ApiError): { title: string; message: string } {
  const bodyMsg = (typeof err.body === "object" && err.body && (err.body as any).message) || undefined;
  const raw = bodyMsg || err.message || "";

  // Known server messages we want to preserve verbatim
  const keepAsIs = [
    "A trailer with the same license plate and jurisdiction already exists.",
    "Trailer is already IN. Next movement must be OUT.",
    "Trailer is already OUT. Next movement must be IN.",
  ];
  if (keepAsIs.some((s) => raw.includes(s))) {
    return { title: "Action blocked", message: raw };
  }

  switch (err.status) {
    case 400:
      return { title: "Check your input", message: raw || "Some fields are invalid. Please review and try again." };
    case 401:
      return { title: "Session expired", message: "Please sign in again to continue." };
    case 403:
      return { title: "Not allowed", message: "You don't have permission to perform this action." };
    case 404:
      return { title: "Not found", message: "The requested resource could not be found." };
    case 409:
      return { title: "Conflict", message: raw || "This action conflicts with current trailer state." };
    case 413:
      return { title: "File too large", message: "The file you tried to upload is too large. Pick a smaller file." };
    case 429:
      return { title: "Too many requests", message: "You’re doing that too often. Please wait a moment and try again." };
    case 500:
    case 502:
    case 503:
    case 504:
      return { title: "Something went wrong", message: "We hit a server issue. Please try again in a moment." };
    default:
      if (err.status <= 0) {
        return { title: "Network issue", message: "We couldn't reach the server. Check your connection and try again." };
      }
      return { title: `Error ${err.status}` , message: raw || "Unexpected error. Please try again." };
  }
}


