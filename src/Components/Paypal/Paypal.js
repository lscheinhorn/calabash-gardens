import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { selectCart } from '../Cart/cartSlice'
import { useSelector } from 'react-redux'
import { keys } from '../../data/siteData'
import { functions as firebaseFunctions } from '../../firebase-config'


export default function Paypal(props) {
  const { shipping, total, subtotal } = props
 const [success, setSuccess] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [orderID, setOrderID] = useState(false);
 const [payerInfo, setPayerInfo] = useState({});
 const [payer, setPayer] = useState({});

 const cartItems = useSelector( selectCart )
 const useServerCheckout = process.env.REACT_APP_PAYPAL_SERVER_CHECKOUT === "enabled"

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

 console.log("items", items)
 // creates a paypal order
 const createOrder = (data, actions) => {
   if (useServerCheckout) {
    if (!firebaseFunctions) {
      setErrorMessage("Checkout is not configured yet. Please contact Calabash Gardens directly.");
      throw new Error("Firebase Functions are not configured.");
    }

    const createPayPalOrder = httpsCallable(firebaseFunctions, "createPayPalOrder");

    return createPayPalOrder(checkoutPayload()).then((result) => {
      const serverOrderID = result.data?.orderID;

      if (!serverOrderID) {
        throw new Error("PayPal did not return an order ID.");
      }

      setOrderID(serverOrderID);
      return serverOrderID;
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
      console.log("orderID", orderID)
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

    return capturePayPalOrder({
      ...checkoutPayload(),
      orderID: data.orderID,
    }).then((result) => {
      const payer = result.data?.payer || {};

      setOrderID(result.data?.sourceOrderId || data.orderID);
      setPayer(payer);
      setPayerInfo({});
      setSuccess(true);
    });
   }

   return actions.order.capture().then(function (details) {
     const { payer } = details;
     console.log("payer", payer)
     console.log("details", details)
     setPayer( payer )
     setPayerInfo( details.purchase_units[0].shipping )
     setSuccess(true);
   });
 };
 //capture likely error
 const onError = () => {
   setErrorMessage("An error occurred with your payment.");
};

//  useEffect(() => {
//   console.log("errorMessage", errorMessage)
//   alert(errorMessage, "Please check your information and try again")
//   }, 
//   [errorMessage] 
// )

useEffect(() => {
    console.log("payerInfo from effect hook", payerInfo)
    console.log("payer from effect hook", payer)

    }, 
    [payerInfo, payer] 
)

 return (
  <>
    {
      success ? 
        <>
          <h1 style={{ textAlign: "center", color: "green"}}>Thank you for your order { payer.name?.given_name || payer.name?.full_name || "" }!</h1>
          <p style={{ textAlign: "center" , font: "bold" }}>Your Order ID is: { orderID }</p>
          <p style={{ textAlign: "center" , font: "bold", fontSize: "120%" }}>Please check your inbox{payer.email_address ? ` at ${payer.email_address}` : ""} for your order confirmation. If you didn't recieve a confirmation email please contact us directly through our contact form or email us at calabashgardens@gmail.com</p>

          {/*<p style={{ textAlign: "center" , font: "bold" }}>If your product needs to be shipped it will be sent to {payerInfo.address.address_line_1} {payerInfo.address.address_line_2} {payerInfo.address.admin_area_2}, {payerInfo.address.admin_area_1} {payerInfo.address.postal_code}</p>*/}

        </> :

        <PayPalScriptProvider
          options={{
            "client-id": keys.paypal.live
          }}
        >
        <PayPalButtons
          style={{ layout: "vertical" }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={useServerCheckout ? onError : undefined}
        />
        {useServerCheckout && errorMessage ? <p style={{ textAlign: "center", color: "red" }}>{errorMessage}</p> : null}
        </PayPalScriptProvider>
      }
    </>
  )
}
