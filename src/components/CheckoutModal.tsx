import { useEffect, useRef, useState } from 'react';

import { usePos } from '@/context/PosContext';

import { formatCurrency } from '@/utils';

import {
  QrCode,
  CreditCard,
  Banknote,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Copy,
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';

interface CreatePixResponse {
  ok: boolean;
  orderId?: string;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  amount?: string;
  pix?: {
    qrCode: string;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
  };
  message?: string;
}

interface OrderStatusResponse {
  ok: boolean;
  order?: {
    id: string | null;
    status: string | null;
    statusDetail: string | null;
    totalAmount: string | null;
    totalPaidAmount: string | null;
  };
  message?: string;
}

export function CheckoutModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { cartTotal, registerSale } = usePos();

  const [method, setMethod] = useState<
    'PIX' | 'CARTAO' | 'DINHEIRO' | null
  >(null);

  const [cashReceived, setCashReceived] = useState('');
  const [success, setSuccess] = useState(false);

  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState('');
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState(
    'Aguardando pagamento...',
  );
  const [pixCopied, setPixCopied] = useState(false);

  const pixCompletedRef = useRef(false);

  const handleFinish = () => {
    if (method === 'DINHEIRO') {
      const received = parseFloat(
        cashReceived.replace(',', '.'),
      );

      const change = received - cartTotal;

      registerSale('DINHEIRO', received, change);
    } else {
      registerSale(method!);
    }

    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  /*
   * GERA O PIX
   */
  useEffect(() => {
    if (method !== 'PIX') {
      return;
    }

    const controller = new AbortController();

    const createPix = async () => {
      pixCompletedRef.current = false;

      setPixLoading(true);
      setPixError('');
      setPixOrderId(null);
      setPixQrCode(null);
      setPixStatus('Gerando PIX...');

      try {
        const response = await fetch(
          '/api/mercadopago/create-order',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Number(cartTotal.toFixed(2)),
            }),
            signal: controller.signal,
          },
        );

        const data =
          (await response.json()) as CreatePixResponse;

        if (
          !response.ok ||
          !data.ok ||
          !data.orderId ||
          !data.pix
        ) {
          throw new Error(
            data.message ||
              'Não foi possível gerar o pagamento PIX.',
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setPixOrderId(data.orderId);
        setPixQrCode(data.pix.qrCode);
        setPixStatus('Aguardando pagamento...');
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        console.error(
          '[Aura POS] Erro ao gerar PIX:',
          error,
        );

        setPixError(
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar o pagamento PIX.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setPixLoading(false);
        }
      }
    };

    void createPix();

    return () => {
      controller.abort();
    };
  }, [method, cartTotal]);

  /*
   * CONSULTA O PAGAMENTO PIX
   *
   * Uma consulta por vez.
   * Nenhum setInterval.
   * AbortController cancela o fetch quando o efeito termina.
   */
  useEffect(() => {
    if (
      method !== 'PIX' ||
      !pixOrderId ||
      success ||
      pixCompletedRef.current
    ) {
      return;
    }

    const controller = new AbortController();

    let timeoutId: ReturnType<typeof setTimeout> | null =
      null;

    const stopPolling = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      controller.abort();
    };

    const checkPayment = async (): Promise<void> => {
      if (
        controller.signal.aborted ||
        pixCompletedRef.current
      ) {
        return;
      }

      try {
        const response = await fetch(
          `/api/mercadopago/order?id=${encodeURIComponent(
            pixOrderId,
          )}`,
          {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        const data =
          (await response.json()) as OrderStatusResponse;

        if (
          controller.signal.aborted ||
          pixCompletedRef.current
        ) {
          return;
        }

        if (
          !response.ok ||
          !data.ok ||
          !data.order
        ) {
          timeoutId = setTimeout(() => {
            void checkPayment();
          }, 3000);

          return;
        }

        const status = data.order.status;
        const statusDetail =
          data.order.statusDetail;

        console.log(
          '[Aura POS] Status PIX:',
          status,
          statusDetail,
        );

        /*
         * PAGAMENTO CONFIRMADO
         */
        if (
          status === 'processed' &&
          statusDetail === 'accredited'
        ) {
          pixCompletedRef.current = true;

          stopPolling();

          setPixStatus('Pagamento aprovado!');

          registerSale('PIX');

          setSuccess(true);

          setTimeout(() => {
            onClose();
          }, 1500);

          return;
        }

        /*
         * PIX EXPIRADO
         */
        if (status === 'expired') {
          stopPolling();

          setPixStatus(
            'PIX expirado. Gere um novo pagamento.',
          );

          return;
        }

        /*
         * PAGAMENTO RECUSADO/CANCELADO
         */
        if (
          status === 'failed' ||
          status === 'canceled'
        ) {
          stopPolling();

          setPixStatus(
            'Pagamento não aprovado.',
          );

          return;
        }

        /*
         * AINDA AGUARDANDO
         */
        setPixStatus(
          'Aguardando pagamento...',
        );

        timeoutId = setTimeout(() => {
          void checkPayment();
        }, 3000);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        console.error(
          '[Aura POS] Erro ao consultar PIX:',
          error,
        );

        timeoutId = setTimeout(() => {
          void checkPayment();
        }, 3000);
      }
    };

    void checkPayment();

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      controller.abort();
    };
  }, [
    method,
    pixOrderId,
    success,
  ]);

  /*
   * COPIAR PIX
   */
  const handleCopyPix = async () => {
    if (!pixQrCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        pixQrCode,
      );

      setPixCopied(true);

      setTimeout(() => {
        setPixCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        '[Aura POS] Erro ao copiar PIX:',
        error,
      );
    }
  };

  /*
   * TELA DE SUCESSO
   */
  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-main flex flex-col items-center justify-center p-4">
        <CheckCircle2
          size={80}
          className="text-success mb-4"
        />

        <h2 className="text-3xl font-bold text-txt-primary mb-2">
          Venda Concluída!
        </h2>
      </div>
    );
  }

  /*
   * CHECKOUT
   */
  return (
    <div className="fixed inset-0 z-50 bg-main flex flex-col">
      <div className="p-4 flex items-center border-b border-line bg-main">
        <button
          type="button"
          onClick={() =>
            method
              ? setMethod(null)
              : onClose()
          }
          className="p-2 -ml-2 text-txt-secondary hover:text-txt-primary cursor-pointer transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <h2 className="text-xl font-bold text-txt-primary ml-2">
          Pagamento
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center bg-main">
        <div className="text-center mb-8 mt-4">
          <div className="text-txt-secondary mb-1">
            Total a Pagar
          </div>

          <div className="text-5xl font-bold text-txt-primary">
            {formatCurrency(cartTotal)}
          </div>
        </div>

        {!method && (
          <div className="w-full max-w-md space-y-4">
            <button
              type="button"
              onClick={() => setMethod('PIX')}
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <QrCode
                size={32}
                className="text-primary mr-4"
              />

              <span className="text-xl font-bold text-txt-primary">
                Pix
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMethod('CARTAO')
              }
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <CreditCard
                size={32}
                className="text-blue-500 mr-4"
              />

              <span className="text-xl font-bold text-txt-primary">
                Cartão (Débito/Crédito)
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMethod('DINHEIRO')
              }
              className="w-full flex items-center p-6 bg-surface border border-line rounded-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <Banknote
                size={32}
                className="text-success mr-4"
              />

              <span className="text-xl font-bold text-txt-primary">
                Dinheiro
              </span>
            </button>
          </div>
        )}

        {method === 'PIX' && (
          <div className="flex flex-col items-center w-full max-w-md">
            {pixLoading && (
              <div className="flex flex-col items-center mt-10">
                <Loader2
                  size={56}
                  className="text-primary animate-spin mb-6"
                />

                <div className="text-xl font-bold text-txt-primary mb-2">
                  Gerando PIX...
                </div>

                <div className="text-txt-secondary text-center">
                  Aguarde enquanto conectamos ao Mercado Pago.
                </div>
              </div>
            )}

            {!pixLoading && pixError && (
              <div className="w-full mt-10 p-5 bg-surface border border-rose-500/30 rounded-2xl text-center">
                <div className="text-rose-500 font-bold text-lg mb-2">
                  Não foi possível gerar o PIX
                </div>

                <div className="text-txt-secondary mb-6">
                  {pixError}
                </div>

                <button
                  type="button"
                  onClick={() => setMethod(null)}
                  className="w-full bg-primary text-black font-bold text-lg py-4 rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            )}

            {!pixLoading &&
              !pixError &&
              pixQrCode && (
                <>
                  <div className="bg-white p-4 rounded-xl mb-5 shadow-md">
                    <QRCodeSVG
                      value={pixQrCode}
                      size={224}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>

                  <div className="text-txt-primary text-center text-lg font-semibold mb-2">
                    Escaneie o QR Code para pagar
                  </div>

                  <div className="text-txt-secondary text-center mb-6">
                    {pixStatus}
                  </div>

                  <div className="w-full bg-surface border border-line rounded-xl p-3 mb-3">
                    <textarea
                      value={pixQrCode}
                      readOnly
                      className="w-full min-h-24 bg-transparent text-txt-secondary text-xs resize-none outline-none"
                      aria-label="Código PIX Copia e Cola"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full flex items-center justify-center gap-2 bg-surface border border-line text-txt-primary font-bold text-lg py-4 rounded-xl active:scale-[0.98] cursor-pointer transition-transform"
                  >
                    <Copy size={20} />

                    {pixCopied
                      ? 'PIX Copiado!'
                      : 'Copiar PIX'}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-5 text-txt-secondary text-sm">
                    {!success && (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        Aguardando confirmação do pagamento...
                      </>
                    )}
                  </div>
                </>
              )}
          </div>
        )}

        {method === 'CARTAO' && (
          <div className="flex flex-col items-center w-full max-w-md mt-10">
            <CreditCard
              size={64}
              className="text-txt-secondary mb-6 opacity-50"
            />

            <div className="text-txt-primary text-xl text-center mb-8">
              Passe o cartão ou aproxime na maquininha.
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] cursor-pointer shadow-lg"
            >
              Pagamento Aprovado
            </button>
          </div>
        )}

        {method === 'DINHEIRO' && (
          <div className="w-full max-w-md flex flex-col h-full">
            <div className="mb-6">
              <label className="text-txt-secondary block mb-2 font-medium">
                Valor Recebido
              </label>

              <input
                type="number"
                value={cashReceived}
                onChange={(e) =>
                  setCashReceived(
                    e.target.value,
                  )
                }
                className="w-full bg-surface border border-line text-txt-primary text-3xl p-4 rounded-xl text-center focus:outline-none focus:border-primary font-bold"
                placeholder="0.00"
                autoFocus
              />
            </div>

            {(() => {
              const received = parseFloat(
                cashReceived.replace(',', '.'),
              );

              if (
                !isNaN(received) &&
                received >= cartTotal
              ) {
                const change =
                  received - cartTotal;

                return (
                  <div className="mb-8 p-4 bg-surface rounded-xl border border-line text-center">
                    <div className="text-txt-secondary mb-1">
                      Troco a devolver
                    </div>

                    <div className="text-4xl font-bold text-accent">
                      {formatCurrency(change)}
                    </div>
                  </div>
                );
              }

              if (
                !isNaN(received) &&
                received > 0 &&
                received < cartTotal
              ) {
                return (
                  <div className="mb-8 p-4 text-center text-rose-500 font-medium">
                    Valor insuficiente
                  </div>
                );
              }

              return null;
            })()}

            <div className="mt-auto pb-4">
              <button
                type="button"
                onClick={handleFinish}
                disabled={
                  !cashReceived ||
                  parseFloat(
                    cashReceived.replace(
                      ',',
                      '.',
                    ),
                  ) < cartTotal
                }
                className="w-full bg-primary text-black font-bold text-xl py-4 rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
