export interface QbTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export interface QbInvoiceRecord {
  Id: string;
  DocNumber?: string;
  Balance: number;
  TotalAmt: number;
  DueDate?: string;
  CustomerRef: { value: string; name?: string };
  BillEmail?: { Address?: string };
  InvoiceLink?: string;
}

export interface QbQueryResponse {
  QueryResponse: {
    Invoice?: QbInvoiceRecord[];
  };
}

export interface QbCompanyInfoResponse {
  CompanyInfo: {
    CompanyName: string;
  };
}
