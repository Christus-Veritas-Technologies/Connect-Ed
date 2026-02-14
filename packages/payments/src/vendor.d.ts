declare module "paynow" {
  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string, authEmail?: string): Payment;
    send(payment: Payment): Promise<PaynowResponse>;
  }

  interface Payment {
    add(title: string, amount: number): void;
  }

  interface PaynowResponse {
    success: boolean;
    redirectUrl: string;
    pollUrl: string;
    error?: string;
  }
}
