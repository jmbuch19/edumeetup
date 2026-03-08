'use client'

import { useEffect } from 'react'

export function WatiWidget() {
    useEffect(() => {
        const s = document.createElement('script')
        s.type = 'text/javascript'
        s.async = true
        s.src = 'https://wati-integration-prod-service.clare.ai/v2/watiWidget.js?24748'

        const options = {
            enabled: true,
            chatButtonSetting: {
                backgroundColor: '#0026e6',
                ctaText: 'Chat with us',
                borderRadius: '25',
                marginLeft: '0',
                marginRight: '20',
                marginBottom: '20',
                ctaIconWATI: false,
                position: 'right',
            },
            brandSetting: {
                brandName: 'EdUmeetup',
                brandSubTitle: 'Typically replies within minutes',
                brandImg: 'https://edumeetup.com/fulllogo.png',
                welcomeText: 'Hi there!\nHow can I help you?',
                messageText: 'Hello, %0A I have a question about https://edumeetup.com',
                backgroundColor: '#0026e6',
                ctaText: 'Chat with us',
                borderRadius: '25',
                autoShow: false,
                phoneNumber: '919825593262',
            },
        }

        s.onload = function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ; (window as any).CreateWhatsappChatWidget(options)
        }

        document.body.appendChild(s)

        return () => {
            if (document.body.contains(s)) document.body.removeChild(s)
        }
    }, [])

    return null
}
