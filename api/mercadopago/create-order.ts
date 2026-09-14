import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'node:https';

interface CreateOrderBody {
  amount: number;
  externalReference?: string;
}

interface MercadoPagoOrderResponse {
  id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string;

  transactions?: {
    payments?: Array<{
      id?: string;
      amount?: string;
      status?: string;
      status_detail?: string;
    }>;
  };

  type_response?: {
    qr_data?: string;
  };
}

function mercadoPagoRequest(
  method: 'POST',
  path: string,
  accessToken: string,
  body: unknown,
): Promise<{
  statusCode: number;
  data: MercadoPagoOrderResponse & {
    message?: string;
    error?: string;
    cause?: unknown;
  };
}> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const request = https.request(
      {
        hostname: 'api.mercadopago.com',
        path,
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': crypto.randomUUID(),
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        let raw = '';

        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          try {
            const data = JSON.parse(raw);

            resolve({
              statusCode: response.statusCode ?? 500,
              data,
            });
          } catch {
            reject(new Error('Resposta inválida do Mercado Pago.'));
          }
        });
      },
    );

    request.on('error', reject);

    request.write(payload);
    request.end();
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Método não permitido. Use POST.',
    });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
    });
  }

  const body = req.body as CreateOrderBody;

  if (
    typeof body?.amount !== 'number' ||
    !Number.isFinite(body.amount) ||
    body.amount <= 0
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Valor da venda inválido.',
    });
  }

  const amount = body.amount.toFixed(2);

  const externalReference =
    body.externalReference?.trim() ||
    `aura-pos-${Date.now()}`;

  const order = {
    type: 'qr',
    total_amount: amount,
    description: 'Venda AURA POS',
    external_reference: externalReference,
    expiration_time: 'PT16M',
    config: {
      qr: {
        external_pos_id: 'AURAPOS01',
        mode: 'dynamic',
      },
    },
    transactions: {
      payments: [
        {
          amount,
        },
      ],
    },
  };

  try {
    const { statusCode, data } = await mercadoPagoRequest(
      'POST',
      '/v1/orders',
      accessToken,
      order,
    );

    if (statusCode < 200 || statusCode >= 300) {
      console.error(
        '[Aura POS] Mercado Pago recusou a Order:',
        JSON.stringify(data, null, 2),
      );

      return res.status(statusCode).json({
        ok: false,
        mercadoPagoStatus: statusCode,
        message:
          data.message ||
          data.error ||
          'Mercado Pago recusou a criação do PIX.',
        data,
      });
    }

    const orderId = data.id;
    const payment = data.transactions?.payments?.[0];
    const qrCode = data.type_response?.qr_data;

    if (!orderId || !payment?.id || !qrCode) {
      console.error(
        '[Aura POS] Resposta do Mercado Pago sem QR:',
        JSON.stringify(data, null, 2),
      );

      return res.status(502).json({
        ok: false,
        message:
          'Mercado Pago criou a cobrança, mas não retornou o QR Code.',
        data,
      });
    }

    console.log(
      '[Aura POS] PIX criado com sucesso:',
      JSON.stringify(
        {
          orderId,
          paymentId: payment.id,
          amount: data.total_amount,
          status: data.status,
          statusDetail: data.status_detail,
        },
        null,
        2,
      ),
    );

    return res.status(201).json({
      ok: true,
      orderId,
      paymentId: payment.id,
      status: data.status,
      statusDetail: data.status_detail,
      amount: data.total_amount,
      pix: {
        qrCode,
        qrCodeBase64: null,
        ticketUrl: null,
      },
    });
  } catch (error) {
    console.error(
      '[Aura POS] Erro ao conectar com o Mercado Pago:',
      error,
    );

    return res.status(500).json({
      ok: false,
      message: 'Não foi possível conectar ao Mercado Pago.',
    });
  }
}