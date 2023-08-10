import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { selectCart } from '../Cart/cartSlice'
import { useSelector } from 'react-redux'
import { keys } from '../../resources/public_keys'


export default function Paypal(props) {
  const { shipping, total, subtotal } = props
 const [success, setSuccess] = useState(false);
 const [ErrorMessage, setErrorMessage] = useState("");
 const [orderID, setOrderID] = useState(false);
 const [payerInfo, setPayerInfo] = useState({});

 const cartItems = useSelector( selectCart )

//  const getShipping = (cartItems) => {
//   let shippingTotal = 0
//   for ( let i = 0 ; i < cartItems.length ; i++ ) {
//       const shipping = Number(cartItems[i].shipping)
//       shippingTotal += shipping
//   }
//   if( shippingTotal > 15 ) {
//       shippingTotal = 15
//   }
//   return shippingTotal
// }

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
          items: [
            ...items
          ]
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
   return actions.order.capture().then(function (details) {
     const { payer } = details;
     console.log("payer", payer)
     console.log("details", details)
     setPayerInfo( details.purchase_units[0].shipping )
     console.log("payerInfo", payerInfo)
     setSuccess(true);
   });
 };
 //capture likely error
 const onError = (data, actions) => {
   setErrorMessage("An Error occured with your payment ");
 };

useEffect(() => {
    console.log("payerInfo from effect hook", payerInfo)
    }, 
    [payerInfo] 
)

 return (
   <PayPalScriptProvider
     options={{
       "client-id": keys.paypal.live
     }}
   >
        <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={createOrder}
        onApprove={onApprove}
        />
   </PayPalScriptProvider>
 );
}