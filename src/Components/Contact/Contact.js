import React, { useRef } from 'react';
import emailjs from '@emailjs/browser';
 
export default function Contact() {
    const form = useRef();
 
    const sendEmail = (e) => {
        // emailjs.sendForm('service_6n5ow3f', 'template_9y2c7vf', form.current, 'anRu1WXRFLGM58t0y')
        // .then((result) => {
        //  // show the user a success message
        // }, (error) => {
        //  // show the user an error
        // })
    }

    return (
        <form ref={form} onSubmit={sendEmail}>
            <div className="form-group">
                <label for="name">Name</label>
                <input className="form-control" type="text" name="from_name" />
                <label for="exampleInputEmail1">Email address</label>
                <input className="form-control" type="email" name="user_email" />
                <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.<br></br></small>
                <label for="phone">Phone</label>
                <input className="form-control" type="text" name="phone" />
                <label>Message</label>
                <textarea className="form-control" name="message" />
                <input className="btn btn-primary" type="submit" value="Send" />
            </div>
            
        </form>
    )
}
 
