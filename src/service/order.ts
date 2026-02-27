import axios, { AxiosError, AxiosInstance } from "axios";

export class OrderService {
  private i: AxiosInstance;
  private authenticated: boolean = false;

  constructor(base_url: string) {
    this.i = axios.create({
      baseURL: base_url,
      headers: {
        "Api-Version": "1",
      },
    });
  }

  async authenticate(
    client_id: string,
    client_secret: string,
  ): Promise<Resp<boolean>> {
    try {
      const req_data = {
        grant_type: "client_credentials",
        client_id,
        client_secret,
        scopes: "order.create order.3ds",
      };

      type Response = {
        access_token: string;
        expires_in: number;
        token_type: string;
      };

      const { data } = await this.i.post<Response>("/auth/token", req_data);

      this.authenticated = true;
      this.i.defaults.headers["Authorization"] =
        `${data.token_type} ${data.access_token}`;

      return {
        success: true,
        data: true,
      };
    } catch (err) {
      console.error("Error to authenticate", err);

      const error = err as AxiosError;

      return {
        success: false,
        data: JSON.stringify(error.response?.data, null, 2),
      };
    }
  }
  async getPublicKey(): Promise<Resp<GetPublicKeyRes>> {
    try {
      const { data } = await this.i.post("/api/order/3ds/public-key");

      return {
        success: true,
        data,
      };
    } catch (err) {
      const error = err as AxiosError;

      return {
        success: false,
        data: JSON.stringify(error.response?.data, null, 2),
      };
    }
  }

  async requestThreeDs(
    req_data: RequestThreeDsReq,
  ): Promise<Resp<RequestThreeDsRes>> {
    if (!this.authenticated) {
      throw new Error("Api should be authenticated");
    }

    try {
      const { data } = await this.i.post<RequestThreeDsRes>(
        "/api/order/3ds",
        req_data,
      );

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error("Error to get 3ds data", err);

      const error = err as AxiosError;

      return {
        success: false,
        data: JSON.stringify(error.response?.data, null, 2),
      };
    }
  }
  async requestOrder(
    req_data: RequestOrderReq,
  ): Promise<Resp<RequestOrderChallengeRes | RequestOrderSuccessRes>> {
    if (!this.authenticated) {
      throw new Error("Api should be authenticated");
    }

    try {
      const { data } = await this.i.post<
        RequestOrderChallengeRes | RequestOrderSuccessRes
      >("/api/order", req_data);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error("Error to request order", err);

      const error = err as AxiosError;

      return {
        success: false,
        data: JSON.stringify(error.response?.data, null, 2),
      };
    }
  }
}

export type RequestThreeDsReq = {
  currency: string;
  amount: number;
  product_description: string;
  customer: {
    ip: string;
    name: string;
    document: string;
  };
  card: {
    type: string;
    installments: number;
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    name: string;
    document: string;
    soft_description: string;
  };
};
export type RequestThreeDsRes = {
  id_three_ds: string;
  validation_method?: {
    url: string;
    token: string;
  };
};
export type RequestOrderReq = {
  external_reference_id?: string;
  description?: string;
  currency: string;
  amount: number;
  type: string;
  customer: {
    name: string;
    document: string;
    ip: string;
  };
  card: {
    installments: number;
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    name: string;
    document: string;
    soft_description: string;
    capture: boolean;
    "3ds": {
      id_three_ds: string;
    };
  };
};
export type RequestOrderChallengeRes = {
  challenge_url: string;
  credential_request: string;
  id_three_ds: string;
};
export type RequestOrderSuccessRes = {
  id_order: string;
  id_merchant: string;
  id_three_ds?: string;
  status: string;
  type: string;
  external_reference_id?: string;
  description?: string;
  customer: {
    name: string;
    document: string;
    ip: string;
  };
  currency: string;
  amount: number;
  amount_captured: number;
  amount_refund: number;
  amount_installment: number;
  installment_number: number;
  amount_interchange: number;
  mcc_code?: string;
  nsu_tef: string;
  nsu_acquirer: string;
  nsu_cancellation?: string;
  card?: {
    brand: string;
    first_digits: string;
    last_digits: string;
    exp_month: string;
    exp_year: string;
    holder_name: string;
    holder_document: string;
  };
  soft_description?: string;
  authorization_code?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  canceled_at?: string;
};

export type GetPublicKeyReq = {
  id_merchant: string;
};
export type GetPublicKeyRes = {
  public_key: string;
};

type Resp<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      data: string;
    };
