import { randFullName, randIp } from "@ngneat/falso";
import { ParcelamosTudo3DSV2 } from "@parcelamostudo-tech/lib-3ds-client";
import cpf from "cpf";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { OrderService } from "./service/order";
import { formatDate } from "./utils";

type FormValues = {
  name: string;
  document: string;
  ip: string;
  amount: string;
  installments: string;
  type: string;
  client_id: string;
  client_secret: string;
  api_env: string;
  cardName: string;
  cardDocument: string;
  cardNumber: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  cardCvv: string;
  cardSoftDescription: string;
  cardProductDescription: string;
  withThreeDs: boolean;
};

type CardType = "challenge-success" | "frictionless-success";
function getDefault(type: CardType): Partial<FormValues> {
  switch (type) {
    case "challenge-success":
      return {
        cardNumber: "4000000000002503",
        cardCvv: "123",
        cardExpirationMonth: "01",
        cardExpirationYear: "2034",
      };
    case "frictionless-success":
      return {
        cardNumber: "4000000000002701",
        cardCvv: "123",
        cardExpirationMonth: "01",
        cardExpirationYear: "2034",
      };

    default:
      return {};
  }
}

type ITimeline = {
  title: string;
  description?: string;
  date: Date;
};

function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [time, setTime] = useState<ITimeline[]>([]);
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      amount: "100",
      installments: "1",
      type: "credit_card",
      cardSoftDescription: "CheckoutDemo",
      cardProductDescription: "CheckoutDemo",
    },
  });

  function newTimeline(title: string, description?: string) {
    setTime((prev) => [{ title, description, date: new Date() }, ...prev]);
  }
  function resetTimeline() {
    setTime([]);
  }

  const onSubmit = handleSubmit(handleExecute);

  const env = watch("api_env");
  const currentAmount = watch("amount");

  const amountFormatted = useMemo(() => {
    return new Intl.NumberFormat("pt-Br", {
      style: "currency",
      currency: "BRL",
    }).format(Number(currentAmount) / 100);
  }, [currentAmount]);
  const timelineComponent = useMemo(() => {
    if (!time.length) {
      return (
        <small className="text-body-secondary">Nenhum item na timeline</small>
      );
    }

    return (
      <ul className="list-group">
        {time.map((item) => (
          <li className="list-group-item">
            <b>{item.title}</b>
            <br />
            {item.description && (
              <>
                {item.description}
                <br />
              </>
            )}
            <small className="text-body-secondary">
              {formatDate(item.date)}
            </small>
          </li>
        ))}
      </ul>
    );
  }, [time]);
  const sandboxButton = useMemo(() => {
    if (env === "https://api.parcelamostudo.tech") {
      return null;
    }

    return (
      <>
        <div
          className="btn-group"
          role="group"
          aria-label="Button group with nested dropdown"
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => generateFakeData()}
          >
            Gerar dados fakes
          </button>

          <div className="btn-group" role="group">
            <button
              type="button"
              className="btn btn-primary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Cartões
            </button>
            <ul className="dropdown-menu">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => setCardData("challenge-success")}
                >
                  Challenge Success
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => setCardData("frictionless-success")}
                >
                  Frictionless Success
                </button>
              </li>
            </ul>
          </div>
        </div>
        <br />
        <br />
      </>
    );
  }, [env]);

  async function handleExecute(data: FormValues) {
    resetTimeline();

    setLoading(true);
    newTimeline("Processo iniciado", env);

    const service = new OrderService(data.api_env);

    const authenticated = await service.authenticate(
      data.client_id,
      data.client_secret,
    );

    if (!authenticated.success) {
      newTimeline("Erro ao se autenticar na api", authenticated.data);
      setLoading(false);
      return;
    }

    newTimeline("Api autenticada com sucesso");

    const public_key = await service.getPublicKey();
    if (!public_key.success) {
      newTimeline("Erro ao buscar public key", public_key.data);
      setLoading(false);
      return;
    }
    newTimeline("Public key requisitada com sucesso");

    const lib = new ParcelamosTudo3DSV2(public_key.data.public_key);

    const response = await lib.execute({
      amount: Number(data.amount),
      currency: "BRL",
      card: {
        exp_month: data.cardExpirationMonth,
        exp_year: data.cardExpirationYear,
        number: data.cardNumber,
      },
      user: {},
    });

    if (response.success) {
      newTimeline("Lib executada com sucesso", response.id_three_ds);
    } else {
      newTimeline("Erro ao executar lib", response.message);
    }
    setLoading(false);
  }

  function generateFakeData() {
    const name = randFullName({ withAccents: false });
    const document = cpf.generate(false);
    setValue("name", name);
    setValue("cardName", name.toLocaleUpperCase());
    setValue("document", document);
    setValue("cardDocument", document);
    setValue("client_id", "fcdf9a5c-65b5-4a03-88bf-64c40c0e29f1");
    setValue("client_secret", "70ef7ec3f33a458da3f6f2199111665e");
    setValue("ip", randIp());
  }
  function setCardData(type: CardType) {
    const data = getDefault(type);

    // @ts-expect-error is okay
    Object.keys(data).forEach((item) => setValue(item, data[item]));
  }

  return (
    <>
      <div className="container">
        <main style={{ paddingBottom: "10px" }}>
          <div className="py-5 text-center">
            <h2>Parcelamos Tudo</h2>
            <h3 style={{ fontSize: "20px" }}>Checkout Demo</h3>
          </div>

          <div className="row g-5">
            <div className="col-8">
              <h4 className="mb-3">Dados do Cliente</h4>
              <form id="checkout-form" onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-sm-4">
                    <label htmlFor="name" className="form-label">
                      Nome
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      {...register("name")}
                    />
                    <div className="invalid-feedback">
                      Valid first name is required.
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <label htmlFor="document" className="form-label">
                      Documento
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="document"
                      {...register("document")}
                      required
                    />
                    <div className="invalid-feedback">
                      Valid first document is required.
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <label htmlFor="ip" className="form-label">
                      IP
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="ip"
                      {...register("ip")}
                      required
                    />
                    <div className="invalid-feedback">
                      Valid first ip is required.
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                <h4 className="mb-3">Payment</h4>

                <div className="my-3">
                  <div
                    className="btn-group"
                    role="group"
                    aria-label="Basic radio toggle button group"
                  >
                    <input
                      type="radio"
                      className="btn-check"
                      id="credit_card"
                      value="credit_card"
                      checked
                      {...register("type")}
                    />
                    <label
                      className="btn btn-outline-primary"
                      htmlFor="credit_card"
                    >
                      Crédito
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="debit_card"
                      value="debit_card"
                      {...register("type")}
                      // disabled
                    />
                    <label
                      className="btn btn-outline-primary"
                      htmlFor="debit_card"
                    >
                      Débito
                    </label>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-2">
                    <label htmlFor="amount" className="form-label">
                      Valor
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="amount"
                      {...register("amount")}
                      required
                    />
                    <small className="text-body-secondary">
                      Valor em centavos
                    </small>
                  </div>
                  <div className="col-md-2">
                    <label htmlFor="amount" className="form-label">
                      Valor
                    </label>
                    <p>{amountFormatted}</p>
                  </div>
                  <div className="col-md-2">
                    <label htmlFor="installments" className="form-label">
                      Parcelas
                    </label>
                    <input
                      type="number"
                      max="12"
                      min="1"
                      className="form-control"
                      id="installments"
                      {...register("installments")}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label
                      htmlFor="cardProductDescription"
                      className="form-label"
                    >
                      Product Description
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cardProductDescription"
                      {...register("cardProductDescription")}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="cardName" className="form-label">
                      Nome no cartão
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cardName"
                      {...register("cardName")}
                      required
                    />
                    <small className="text-body-secondary">
                      Full name as displayed on card
                    </small>
                    <div className="invalid-feedback">
                      Name on card is required
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="cardDocument" className="form-label">
                      Documento do proprietário
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cardDocument"
                      {...register("cardDocument")}
                      required
                    />
                    <div className="invalid-feedback">Document is required</div>
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="cardNumber" className="form-label">
                      Número
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cardNumber"
                      {...register("cardNumber")}
                      required
                    />
                    <div className="invalid-feedback">
                      Credit card number is required
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="cardExpirationMonth" className="form-label">
                      Expiration (MM)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="form-control"
                      id="cardExpirationMonth"
                      {...register("cardExpirationMonth")}
                      required
                    />
                    <div className="invalid-feedback">
                      Expiration date required
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="cardExpirationYear" className="form-label">
                      Expiration (YY)
                    </label>
                    <input
                      type="number"
                      min="2024"
                      max="3000"
                      className="form-control"
                      id="cardExpirationYear"
                      {...register("cardExpirationYear")}
                      required
                    />
                    <div className="invalid-feedback">
                      Expiration date required
                    </div>
                  </div>

                  <div className="col-md-2">
                    <label htmlFor="cardCvv" className="form-label">
                      CVV
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="cardCvv"
                      {...register("cardCvv")}
                      required
                    />
                    <div className="invalid-feedback">
                      Security code required
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="cardSoftDescription" className="form-label">
                      Soft Description
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cardSoftDescription"
                      {...register("cardSoftDescription")}
                      required
                    />
                    <div className="invalid-feedback">
                      Security code required
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                <button
                  className="w-100 btn btn-primary btn-lg"
                  type="submit"
                  disabled={loading}
                >
                  Continue to checkout
                </button>
              </form>
            </div>
            <div className="col-4">
              <h4 className="mb-3">Credenciais</h4>
              <div className="input-group">
                <select className="form-select" {...register("api_env")}>
                  <option value="https://sandbox.api.parcelamostudo.tech">
                    Sandbox
                  </option>
                  <option value="https://api.parcelamostudo.tech">
                    Produção
                  </option>
                </select>
                <input
                  type="text"
                  aria-label="First name"
                  className="form-control"
                  placeholder="Client ID"
                  {...register("client_id")}
                  required
                />
                <input
                  type="password"
                  aria-label="Last name"
                  className="form-control"
                  placeholder="Client Secret"
                  {...register("client_secret")}
                  required
                />
              </div>
              <br />
              {sandboxButton}
              <h4 className="mb-3">Timeline</h4>
              {timelineComponent}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
