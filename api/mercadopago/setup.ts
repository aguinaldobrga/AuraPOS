import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MercadoPagoResponse {
  id?: string | number;
  external_id?: string;
  status?: string;
  message?: string;
  error?: string;
  cause?: unknown;
  qr_response?: {
    qr_code?: string;
    image?: string;
  };
}

interface StoreSearchResponse {
  paging?: {
    total?: number;
  };
  results?: MercadoPagoResponse[];
}

interface PosSearchResponse {
  paging?: {
    total?: number;
  };
  data?: MercadoPagoResponse[];
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

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    /*
     * 1. Descobre o usuário Mercado Pago
     */

    const userResponse = await fetch(
      'https://api.mercadopago.com/users/me',
      {
        method: 'GET',
        headers,
      },
    );

    const userText = await userResponse.text();

    let userData: MercadoPagoResponse;

    try {
      userData = JSON.parse(userText) as MercadoPagoResponse;
    } catch {
      return res.status(502).json({
        ok: false,
        step: 'get-user',
        message: 'Mercado Pago retornou uma resposta inválida.',
        status: userResponse.status,
        responsePreview: userText.slice(0, 300),
      });
    }

    if (!userResponse.ok || !userData.id) {
      return res.status(userResponse.status || 502).json({
        ok: false,
        step: 'get-user',
        message:
          userData.message ||
          userData.error ||
          'Não foi possível identificar a conta Mercado Pago.',
        data: userData,
      });
    }

    const userId = String(userData.id);

    /*
     * 2. Dados reais da loja
     */

    const latitude = -2.983012;
    const longitude = -59.992337;

    const storeExternalId = 'AURAPOSSTORE';
    const posExternalId = 'AURAPOS01';

    /*
     * 3. Procura a loja existente
     *
     * Mercado Pago:
     * GET /users/{user_id}/stores/search
     */

    const storeSearchResponse = await fetch(
      `https://api.mercadopago.com/users/${userId}/stores/search?external_id=${storeExternalId}`,
      {
        method: 'GET',
        headers,
      },
    );

    const storeSearchText = await storeSearchResponse.text();

    let storeSearchData: StoreSearchResponse;

    try {
      storeSearchData = JSON.parse(
        storeSearchText,
      ) as StoreSearchResponse;
    } catch {
      return res.status(502).json({
        ok: false,
        step: 'search-store',
        message:
          'Mercado Pago retornou uma resposta inválida ao procurar a loja.',
        status: storeSearchResponse.status,
        responsePreview: storeSearchText.slice(0, 500),
      });
    }

    let store =
      storeSearchData.results?.find(
        (item) => item.external_id === storeExternalId,
      ) ?? null;

    /*
     * 4. Se não encontrou, cria a loja
     */

    if (!store?.id) {
      const storeResponse = await fetch(
        `https://api.mercadopago.com/users/${userId}/stores`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'AURA POS',
            external_id: storeExternalId,
            location: {
              street_name: 'Rua São Luís Lírio',
              street_number: '648',
              city_name: 'Manaus',
              state_name: 'Amazonas',
              latitude,
              longitude,
              reference: 'Novo Milênio',
            },
          }),
        },
      );

      const storeText = await storeResponse.text();

      let storeData: MercadoPagoResponse;

      try {
        storeData = JSON.parse(storeText) as MercadoPagoResponse;
      } catch {
        return res.status(502).json({
          ok: false,
          step: 'create-store',
          message:
            'Mercado Pago retornou uma resposta inválida ao criar a loja.',
          status: storeResponse.status,
          responsePreview: storeText.slice(0, 500),
        });
      }

      if (!storeResponse.ok || !storeData.id) {
        return res.status(storeResponse.status || 502).json({
          ok: false,
          step: 'create-store',
          message:
            storeData.message ||
            storeData.error ||
            'Não foi possível criar a loja.',
          data: storeData,
        });
      }

      store = storeData;
    }

    const storeId = String(store.id);

    /*
     * 5. Procura o POS existente
     */

    const posSearchResponse = await fetch(
      `https://api.mercadopago.com/v2/pos?external_id=${posExternalId}`,
      {
        method: 'GET',
        headers,
      },
    );

    const posSearchText = await posSearchResponse.text();

    let posSearchData: PosSearchResponse;

    try {
      posSearchData = JSON.parse(
        posSearchText,
      ) as PosSearchResponse;
    } catch {
      return res.status(502).json({
        ok: false,
        step: 'search-pos',
        message:
          'Mercado Pago retornou uma resposta inválida ao procurar o POS.',
        status: posSearchResponse.status,
        responsePreview: posSearchText.slice(0, 500),
      });
    }

    let pos =
      posSearchData.data?.find(
        (item) =>
          item.external_id === posExternalId &&
          item.id,
      ) ?? null;

    /*
     * 6. Se não encontrou, cria o POS
     */

    if (!pos?.id) {
      const posResponse = await fetch(
        'https://api.mercadopago.com/v2/pos',
        {
          method: 'POST',
          headers: {
            ...headers,
            'X-Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            name: 'AURA POS 01',
            store_id: storeId,
            external_id: posExternalId,
          }),
        },
      );

      const posText = await posResponse.text();

      let posData: MercadoPagoResponse;

      try {
        posData = JSON.parse(posText) as MercadoPagoResponse;
      } catch {
        return res.status(502).json({
          ok: false,
          step: 'create-pos',
          message:
            'Mercado Pago retornou uma resposta inválida ao criar o POS.',
          status: posResponse.status,
          responsePreview: posText.slice(0, 500),
        });
      }

      if (!posResponse.ok || !posData.id) {
        return res.status(posResponse.status || 502).json({
          ok: false,
          step: 'create-pos',
          message:
            posData.message ||
            posData.error ||
            'Não foi possível criar o caixa AURA POS.',
          data: posData,
        });
      }

      pos = posData;
    }

    /*
     * 7. Configuração concluída
     */

    return res.status(200).json({
      ok: true,
      message: 'AURA POS configurado com sucesso no Mercado Pago.',
      userId,

      coordinates: {
        latitude,
        longitude,
      },

      store: {
        id: String(store.id),
        externalId: store.external_id,
      },

      pos: {
        id: String(pos.id),
        externalId: pos.external_id,
        status: pos.status,
        qrCode: pos.qr_response?.qr_code ?? null,
        qrImage: pos.qr_response?.image ?? null,
      },
    });
  } catch (error) {
    console.error(
      '[Aura POS] Erro no setup do Mercado Pago:',
      error,
    );

    return res.status(500).json({
      ok: false,
      step: 'unexpected',
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}