// scripts/embedRCA.ts

import { pipeline } from "@xenova/transformers";
import { pineconeIndex } from "../config/pinecone";
import { v4 as uuidv4 } from "uuid";

// Example RCA data
const RCA_KNOWLEDGE_BASE  = [
  {
    category: "gateway-timeout",
    text: `504 Gateway Timeout from Razorpay usually occurs due to upstream bank latency.
Use circuit breaker and redirect to fallback UPI channel.`,
  },
  {
    category: "insufficient-funds",
    text: `Transaction declined due to insufficient funds.
Notify user and suggest overdraft option or balance alert.`,
  },
  {
    category: "bank-api-failure",
    text: `Bank's internal API did not respond within SLA window.
Flag the issue to bank's NOC and retry transaction after delay.`,
  },
  {
    category: "authentication-failure",
    text: `Multi-factor authentication failed due to expired OTP.
Inform user and prompt for OTP resend.`,
  },
  {
    category: "network-error",
    text: `Client-side network error during payment.
Prompt user to check internet connectivity and retry transaction.`,
  },
  {
    category: "payment-processor-error",
    text: `Payment gateway (e.g., Razorpay) returned 500 Internal Server Error.
Raise ticket with gateway provider and attempt fallback.`,
  },
  {
    category: "invalid-account",
    text: `Transaction failed due to incorrect beneficiary account details.
Validate IFSC and account number format before retry.`,
  },
  {
    category: "limit-exceeded",
    text: `Daily transaction limit exceeded for UPI.
Inform user about UPI limits and suggest NetBanking or card option.`,
  },
  {
    category: "duplicate-transaction",
    text: `System detected possible duplicate transaction within 60 seconds.
Log incident, and suggest user to wait before retrying.`,
  },
  {
    category: "invalid-upi-id",
    text: `Entered UPI ID is invalid or no longer active.
Prompt user to verify UPI handle with recipient.`,
  },
  {
    category: "maintenance-downtime",
    text: `Bank server under scheduled maintenance.
Display maintenance notice and retry option post window.`,
  },
  {
    category: "timeout-client",
    text: `Client-side request timed out after 30 seconds.
Recommend retry with better network or increase client timeout.`,
  },
  {
    category: "card-expired",
    text: `Debit card declined due to expiration.
Advise user to update card or switch to alternate payment method.`,
  },
  {
    category: "kyc-pending",
    text: `Transaction blocked due to incomplete KYC.
Prompt user to complete KYC for full access.`,
  },
  {
    category: "third-party-failure",
    text: `External fraud detection service blocked transaction.
Log alert and notify user of verification delay.`,
  },
  {
    category: "chargeback-risk",
    text: `High chargeback risk detected for card payment.
Route via lower-risk channel or request alternate verification.`,
  },
  {
    category: "incomplete-data",
    text: `Missing required transaction fields like account or amount.
Log request and prompt UI fix or input validation.`,
  },
  {
    category: "expired-session",
    text: `User session expired before transaction confirmation.
Request re-authentication and reload payment state.`,
  },
  {
    category: "currency-mismatch",
    text: `Currency mismatch between payer and merchant settings.
Convert currency or route to multi-currency processor.`,
  },
  {
    category: "bank-declined",
    text: `Bank declined transaction with code 91 (issuer unavailable).
Retry later or suggest alternate bank/card.`,
  },
  {
    category: "fraud-flag",
    text: `Transaction flagged as suspicious due to IP or device mismatch.
Route for manual verification and inform user.`,
  },
  {
    category: "retry-limit",
    text: `Maximum retry attempts reached for this transaction.
Advise user to start fresh transaction after cooldown.`,
  }
];

// Optional: break long RCA text into smaller chunks
function chunkText(text: string, maxLength = 512): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.?!])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export const embedAndUploadRCA = async () => {
  const extractor = await pipeline("feature-extraction", "Xenova/bge-base-en");
  const records = [];

  for (const doc of RCA_KNOWLEDGE_BASE) {
    const chunks = chunkText(doc.text);
    for (const chunk of chunks) {
      const output = await extractor(chunk, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      records.push({
        id: uuidv4(),
        values: embedding,
        metadata: {
          chunk_text: chunk,
          category: doc.category,
        },
      });
    }
  }

  console.log(`Uploading ${records.length} records to Pinecone...`);

  await pineconeIndex.namespace("my-namespace").upsert(records);
  console.log("✅ Upload complete.");
};

// Run it
embedAndUploadRCA().catch(console.error);
