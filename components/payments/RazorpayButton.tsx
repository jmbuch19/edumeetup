'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// You must add this to your app/layout.tsx `<head>` or via Next/Script:
// <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

interface RazorpayButtonProps {
    circuitRegistrationId: string
    buttonText?: string
}

export default function RazorpayButton({ circuitRegistrationId, buttonText = "Pay Now" }: RazorpayButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handlePayment = async () => {
        setIsLoading(true)
        try {
            // 1. T21: Hit our backend to compute pricing and generate the Razorpay Order
            const orderRes = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ circuitRegistrationId })
            })

            const orderData = await orderRes.json()

            if (!orderRes.ok || !orderData.orderId) {
                alert(orderData.error || 'Failed to initialize payment gateway')
                setIsLoading(false)
                return
            }

            // 2. Mount the Razorpay JS Checkout UI
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
                amount: orderData.amount, // Computed securely by server
                currency: orderData.currency,
                name: "EdUmeetup",
                description: "Fair Circuit Registration",
                order_id: orderData.orderId,
                handler: function (response: any) {
                    // Success callback! The Webhook will handle the actual DB updates securely in the background (T19).
                    // We just reload the page so the UI updates to show the CONFIRMED status.
                    router.refresh()
                },
                prefill: {
                    name: "University Representative",
                },
                theme: {
                    color: "#f97316" // EdUmeetup Orange
                }
            };

            const rzp = new (window as any).Razorpay(options);
            
            rzp.on('payment.failed', function (response: any){
                alert(`Payment failed: ${response.error.description}`);
            });

            rzp.open();
        } catch (error) {
            console.error(error)
            alert('Payment initialization failed.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button 
            onClick={handlePayment} 
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {buttonText}
        </button>
    )
}
