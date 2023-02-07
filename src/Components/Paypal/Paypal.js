import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { selectCart } from '../Cart/cartSlice'
import { useSelector } from 'react-redux'

export default function Paypal() {
 const [success, setSuccess] = useState(false);
 const [ErrorMessage, setErrorMessage] = useState("");
 const [orderID, setOrderID] = useState(false);
 const [payerInfo, setPayerInfo] = useState({});

 const cartItems = useSelector( selectCart )

 const purchaseUnits = cartItems.map( item => {
    return {
        name: item.title,
        quantity: item.quantity,
        amount: {
            currency_code: "USD",
            value: item.price * item.quantity
        },
        reference_id: item.key
    }
 })
 console.log("purchaseUnits", purchaseUnits)
 // creates a paypal order
 const createOrder = (data, actions) => {
   return actions.order
     .create({
       purchase_units: [
        ...purchaseUnits,
        {
          name: "Shipping",
          amount: {
              currency_code: "USD",
              value: 15
        },
        reference_id: "001"
        }
      ],
       
       // not needed if a shipping address is actually needed
       application_context: {
         shipping_preference: "GET_FROM_FILE",
       },
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
       "client-id":"AWoGrToBGZi88Yq-dnnKkny5ViSK1qdtoL6QkFH-tch_nzWUETTSns_EwinzhYckX3tBsBFDewHcNGrz",
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