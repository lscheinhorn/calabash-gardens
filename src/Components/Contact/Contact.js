import React, { useRef } from 'react';
import emailjs from '@emailjs/browser';
 
export default function Contact() {
    const form = useRef();
 
    const sendEmail = (e) => {
        e.preventDefault(); // prevents the page from reloading when you hit “Send”
        emailjs.sendForm('service_6n5ow3f', 'template_9y2c7vf', form.current, 'anRu1WXRFLGM58t0y')
        .then((result) => {
         // show the user a success message
        }, (error) => {
         // show the user an error
        })
    }

    return (
        <form ref={form} onSubmit={sendEmail}>
            <label>Name</label>
            <input type="text" name="from_name" />
            <label>Email</label>
            <input type="email" name="user_email" />
            <label>Message</label>
            <textarea name="message" />
            <input type="submit" value="Send" />
        </form>
    )
}
 
