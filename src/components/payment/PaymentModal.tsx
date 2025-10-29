import { useState } from "react";
import PaymentForm from "./PaymentForm";
import { X } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  equipmentTitle: string;
  onSuccess?: (paymentId: string) => void;
}

const PaymentModal = ({
  isOpen,
  onClose,
  bookingRequestId,
  ownerId,
  totalAmount,
  equipmentTitle,
  onSuccess,
}: PaymentModalProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSuccess = (paymentId: string) => {
    onSuccess?.(paymentId);
    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isClosing ? "animate-fadeOut" : "animate-fadeIn"
      }`}
      aria-labelledby="payment-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto ${
          isClosing ? "animate-slideDown" : "animate-slideUp"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 id="payment-modal-title" className="text-2xl font-bold">
              Complete Payment
            </h2>
            <p className="text-sm text-gray-600 mt-1">{equipmentTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close payment modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Payment Form */}
        <div className="p-6">
          <PaymentForm
            bookingRequestId={bookingRequestId}
            ownerId={ownerId}
            totalAmount={totalAmount}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
