import { AgentAction } from "./types";

export async function createRMA(issueId: string) {
  console.log(`RMA created for issue ${issueId}`);
  return { message: `RMA created for issue ${issueId}` };
}

export async function flagFinanceDispute(issueId: string) {
  console.log(`Finance dispute flagged for issue ${issueId}`);
  return { message: `Finance team notified for issue ${issueId}` };
}

export async function requestPhotos(issueId: string) {
  console.log(`Requested photos for issue ${issueId}`);
  return { message: `Requested additional photos for issue ${issueId}` };
}

export async function notifySupplier(issueId: string) {
  console.log(`Supplier notified for issue ${issueId}`);
  return { message: `Supplier notified for issue ${issueId}` };
}

export async function performAction(action: AgentAction, issueId: string) {
  switch (action) {
    case "create_rma":
      return createRMA(issueId);
    case "flag_finance_dispute":
      return flagFinanceDispute(issueId);
    case "request_photos":
      return requestPhotos(issueId);
    case "notify_supplier":
      return notifySupplier(issueId);
    default:
      return { message: "No action needed." };
  }
}
