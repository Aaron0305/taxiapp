'use client';

interface ModalPagoProps {
  visible: boolean;
  monto: string;
  onPagar: (metodo: 'efectivo' | 'tarjeta') => void;
  onCerrar: () => void;
}

export default function ModalPago({ visible, monto, onPagar, onCerrar }: ModalPagoProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Método de pago</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <p className="text-3xl font-bold text-center text-white mb-6">{monto}</p>

        <div className="space-y-3">
          <button
            onClick={() => onPagar('efectivo')}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-all"
          >
            💵 Pagar en efectivo
          </button>
          <button
            onClick={() => onPagar('tarjeta')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-all"
          >
            💳 Pagar con tarjeta
          </button>
        </div>
      </div>
    </div>
  );
}
