import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { selectCart } from '../Cart/cartSlice'
import { useSelector } from 'react-redux'
import { keys } from '../../resources/public_keys'


export default function Paypal(props) {
  const { shipping, total, subtotal } = props
 const [success, setSuccess] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [orderID, setOrderID] = useState(false);
 const [payerInfo, setPayerInfo] = useState({});
 const [payer, setPayer] = useState({});

 const cartItems = useSelector( selectCart )


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
 const onError = (data, actions) => {
   setErrorMessage("An Error occured with your payment ");
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
          <h1 style={{ textAlign: "center", color: "green"}}>Thank you for your order { payer.name.given_name }!</h1>
          <p style={{ textAlign: "center" , font: "bold" }}>Your Order ID is: { orderID }</p>
          <p style={{ textAlign: "center" , font: "bold", fontSize: "120%" }}>Please check your inbox at {payer.email_address } for your order confirmation. If you didn't recieve a confirmation email please contact us directly through our contact form or email us at calabashgardens@gmail.com</p>

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
        />
        </PayPalScriptProvider>
      }
    </>
  )
}