import React, { useRef, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { selectCart } from '../Cart/cartSlice'
import { useSelector } from 'react-redux'
import { keys } from '../../data/siteData'
import { functions as firebaseFunctions } from '../../firebase-config'


export default function Paypal(props) {
  const { shipping, total, subtotal } = props
 const [success, setSuccess] = useState(false);
 const [checkoutLocked, setCheckoutLocked] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [processingMessage, setProcessingMessage] = useState("");
 const [orderID, setOrderID] = useState(false);
 const [payer, setPayer] = useState({});
 const checkoutAttemptIdRef = useRef("");
 const checkoutTokenRef = useRef("");

 const cartItems = useSelector( selectCart )
 const useServerCheckout = process.env.REACT_APP_PAYPAL_SERVER_CHECKOUT === "enabled"

 const createOpaqueValue = () => {
   const browserCrypto = window.crypto;

   if (!browserCrypto?.getRandomValues) {
     throw new Error("Secure checkout authorization is unavailable in this browser.");
   }

   const bytes = new Uint8Array(32);
   browserCrypto.getRandomValues(bytes);
   return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
 }

 const checkoutIdentity = () => {
   if (!checkoutAttemptIdRef.current) {
     checkoutAttemptIdRef.current = createOpaqueValue();
   }

   if (!checkoutTokenRef.current) {
     checkoutTokenRef.current = createOpaqueValue();
   }

   return {
     checkoutAttemptId: checkoutAttemptIdRef.current,
     checkoutToken: checkoutTokenRef.current,
   }
 }

 const resetCheckoutIdentity = () => {
   checkoutAttemptIdRef.current = "";
   checkoutTokenRef.current = "";
 }

 const checkoutPayload = () => ({
    cartItems,
    shipping: shipping?.shipping || "0.00",
    shippingPreference: shipping?.pref || "GET_FROM_FILE",
    subtotal: subtotal || "0.00",
    total: total || "0.00",
 })

 const items = cartItems.map( item => {
    return {
      name: item.title,
      quantity: item.quantity,
      unit_amount: {
        currency_code: "USD",
        value: item.price
      },
      sku: item.key
    }
 })

 // creates a paypal order
 const createOrder = (data, actions) => {
   if (useServerCheckout) {
    if (!firebaseFunctions) {
      setErrorMessage("Checkout is not configured yet. Please contact Calabash Gardens directly.");
      throw new Error("Firebase Functions are not configured.");
    }

    const createPayPalOrder = httpsCallable(firebaseFunctions, "createPayPalOrder");

    setErrorMessage("");
    setProcessingMessage("");

    return createPayPalOrder({
      ...checkoutPayload(),
      ...checkoutIdentity(),
    }).then((result) => {
      const serverOrderID = result.data?.orderID;

      if (!serverOrderID) {
        throw new Error("PayPal did not return an order ID.");
      }

      setOrderID(serverOrderID);
      return serverOrderID;
    }).catch((error) => {
      resetCheckoutIdentity();
      setCheckoutLocked(false);
      setErrorMessage("Checkout could not be started. Please refresh your cart and try again.");
      throw error;
    });
   }

   return actions.order
     .create({
      intent: "CAPTURE",
      payment_source: {
        paypal: {
          experience_content: {
            shipping_preference: shipping.pref
          }
        }
      },
      purchase_units: [
        {
          reference_id: "001",
          description: "Calabash Gardens Online Order",
          amount: {
            currency_code: "USD",
            breakdown: {
              item_total: {
                value: subtotal.toString(),
                currency_code: "USD"
              },
              shipping: {
                value: shipping.shipping,
                currency_code: "USD"
              }
            },
            value: total.toString(),
          },
          items
        },
      ]
    })
    .then((orderID) => {
      setOrderID(orderID);
      return orderID;
    });
 };
 
 // check Approval
 const onApprove = (data, actions) => {
   if (useServerCheckout) {
    if (!firebaseFunctions) {
      setErrorMessage("Checkout is not configured yet. Please contact Calabash Gardens directly.");
      throw new Error("Firebase Functions are not configured.");
    }

    const capturePayPalOrder = httpsCallable(firebaseFunctions, "capturePayPalOrder");

    setCheckoutLocked(true);
    setErrorMessage("");
    setProcessingMessage("Confirming your payment. Please keep this page open.");

    return capturePayPalOrder({
      checkoutToken: checkoutTokenRef.current,
      orderID: data.orderID,
    }).then((result) => {
      if (result.data?.status === "not_paid" && result.data?.retryAllowed === true) {
        resetCheckoutIdentity();
        setCheckoutLocked(false);
        setProcessingMessage("");
        setErrorMessage("Payment was not completed. Please choose a payment method and try again.");
        return actions.restart ? actions.restart() : undefined;
      }

      if (result.data?.finalized !== true || result.data?.status !== "paid") {
        setProcessingMessage(
          "Your payment is still being confirmed. Please do not submit another payment. Calabash Gardens will review this order.",
        );
        return;
      }

      const payer = result.data?.payer || {};

      setOrderID(result.data?.sourceOrderId || data.orderID);
      setPayer(payer);
      setSuccess(true);
    }).catch(() => {
      setCheckoutLocked(true);
      setErrorMessage("");
      setProcessingMessage(
        "We could not confirm the final payment status. Please do not submit another payment. Calabash Gardens will review this order.",
      );
    });
   }

   return actions.order.capture().then(function (details) {
     const { payer } = details;
     setPayer( payer )
     setSuccess(true);
   });
 };
 //capture likely error
 const onError = () => {
   setCheckoutLocked(false);
   setErrorMessage("An error occurred with your payment.");
};

 return (
  <>
    {
      success ? 
        <>
          <h1 style={{ textAlign: "center", color: "green"}}>Thank you for your order { payer.name?.given_name || payer.name?.full_name || "" }!</h1>
          <p style={{ textAlign: "center" , font: "bold" }}>Your Order ID is: { orderID }</p>
          <p style={{ textAlign: "center" , font: "bold", fontSize: "120%" }}>Please check your inbox{payer.email_address ? ` at ${payer.email_address}` : ""} for your order confirmation. If you didn't recieve a confirmation email please contact us directly through our contact form or email us at calabashgardens@gmail.com</p>
        </> :

        <PayPalScriptProvider
          options={{
            "client-id": process.env.REACT_APP_PAYPAL_CLIENT_ID || keys.paypal.live
          }}
        >
        {!checkoutLocked ? (
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={useServerCheckout ? onError : undefined}
          />
        ) : null}
        {useServerCheckout && processingMessage ? (
          <p aria-live="polite" style={{ textAlign: "center", color: "#7a5d00" }}>{processingMessage}</p>
        ) : null}
        {useServerCheckout && errorMessage ? <p style={{ textAlign: "center", color: "red" }}>{errorMessage}</p> : null}
        </PayPalScriptProvider>
      }
    </>
  )
}
