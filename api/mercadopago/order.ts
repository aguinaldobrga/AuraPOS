import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MercadoPagoOrderResponse {
  id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string;
  total_paid_amount?: string;
  created_date?: string;
  last_updated_date?: string;

  transactions?: {
    payments?: Array<{
      id?: string;
      amount?: string;
      paid_amount?: string;
      status?: string;
      status_detail?: string;
    }>;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      message: 'Método não permitido. Use GET.',
    });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
    });
  }

  const orderId =
    typeof req.query.id === 'string' ? req.query.id : undefined;

  if (!orderId) {
    return res.status(400).json({
      ok: false,
      message: 'Informe o ID da Order.',
      exemplo: '/api/mercadopago/order?id=ORDER_ID',
    });
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data =
      (await response.json()) as MercadoPagoOrderResponse & {
        message?: string;
        error?: string;
      };

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        mercadoPagoStatus: response.status,
        message:
          data.message ||
          data.error ||
          'Mercado Pago recusou a consulta da Order.',
        data,
      });
    }

    const payment = data.transactions?.payments?.[0];

    return res.status(200).json({
      ok: true,
      mercadoPagoStatus: response.status,
      order: {
        id: data.id ?? null,
        status: data.status ?? null,
        statusDetail: data.status_detail ?? null,
        totalAmount: data.total_amount ?? null,
        totalPaidAmount:
          data.total_paid_amount ??
          payment?.paid_amount ??
          null,
        paymentStatus: payment?.status ?? null,
        paymentStatusDetail:
          payment?.status_detail ?? null,
        paymentId: payment?.id ?? null,
        createdDate: data.created_date ?? null,
        lastUpdatedDate:
          data.last_updated_date ?? null,
      },
    });
  } catch (error) {
    console.error(
      '[Aura POS] Erro ao consultar Order:',
      error,
    );

    return res.status(500).json({
      ok: false,
      message:
        'Não foi possível consultar a Order no Mercado Pago.',
    });
  }
}